<script>
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { cubicInOut } from "svelte/easing";
	import { app_two } from "$lib/three/app_two.js";
	import { loading } from "$lib/loading.js";
	import { wipeCss } from "$lib/animation.js";

	let { data } = $props();

	let canvas;
	let app;

	function wipeOut(node, { direction = 1, vertical = false } = {}) {
		return {
			duration: DURATION,
			easing: cubicInOut,
			// t runs 1 → 0, so the global sweep progress is 1 - t.
			css: (t) => wipeCss(1 - t, direction, vertical, false),
		};
	}

	function wipeIn(node, { direction = 1, vertical = false } = {}) {
		return {
			duration: DURATION,
			easing: cubicInOut,
			// t runs 0 → 1, matching the global sweep progress.
			css: (t) => wipeCss(t, direction, vertical, true),
		};
	}

	// True when the viewport is portrait (phone / vertical). Drives the swap to
	// vertical navigation (swipe top↔bottom) and the vertical title wipe.
	let isPortrait = $state(false);

	let currentIndex = $state(data.index);
	const current = $derived(data.artists[currentIndex]);
	const heading = $derived(
		current?.name || current?.surname
			? [current.name, current.surname].filter(Boolean)
			: [current?.title ?? ""],
	);

	// Direction of the wipe, driven by navigation order:
	// going forward (next) wipes left→right, going back wipes right→left.
	let direction = $state(1);
	let prevIndex = data.index;
	$effect(() => {
		if (currentIndex !== prevIndex) {
			direction = currentIndex > prevIndex ? -1 : 1;
			prevIndex = currentIndex;
		}
	});

	const DURATION = 800;
	// Wipe geometry (FEATHER) lives in $lib/animation.js; blur amount + band
	// width live in CSS (.title-blur / --band).

	// Angle of the sweep, matching the `side` keyword below, so the wipe mask and
	// the blurred-seam band (built in CSS from --edge/--ang) stay aligned.
	const wipeAngle = $derived(
		isPortrait ? (direction === -1 ? 180 : 0) : direction === 1 ? 90 : 270,
	);

	$effect(() => {
		if (app && data.index !== currentIndex) {
			currentIndex = data.index;
			app.jumpTo(data.index);
		}
	});

	onMount(() => {
		loading.set(true);
		canvas.style.width = window.innerWidth + "px";
		canvas.style.height = window.innerHeight + "px";
		isPortrait = window.innerHeight > window.innerWidth;
		const sourcesForViewport = () =>
			data.artists.map(
				(a) => (isPortrait ? a.vertical_file : a.file) || a.file,
			);

		app = app_two({
			canvas,
			images: sourcesForViewport(),
			startIndex: data.index,
			onChange: (index) => {
				currentIndex = index;
				goto(`/${data.artists[index].slug}`, {
					noScroll: true,
					keepFocus: true,
				});
			},
			onReady: () => loading.set(false),
		});
		app.init();
		app.setOrientation(isPortrait);
		// Touch devices have no hover; bend the vertex per-transition instead.
		app.setTouch(
			window.matchMedia?.("(pointer: coarse)").matches ||
				"ontouchstart" in window,
		);

		const onResize = (ev) => {
			canvas.style.width = window.innerWidth + "px";
			canvas.style.height = window.innerHeight + "px";
			app.onEventHandler("resize", {
				ev,
				width: window.innerWidth,
				height: window.innerHeight,
			});
			const portrait = window.innerHeight > window.innerWidth;
			if (portrait !== isPortrait) {
				isPortrait = portrait;
				app.setImages(sourcesForViewport());
				app.setOrientation(portrait);
			}
		};
		const onMouseMove = (ev) => app.onEventHandler("mousemove", { ev });
		const onClick = (ev) => app.onEventHandler("click", { ev });

		// Touch: drag the reveal origin under the finger, then on release decide
		// between a swipe (navigate by direction) and a tap (navigate by half).
		// Portrait swipes top↔bottom; landscape swipes left↔right.
		const SWIPE_THRESHOLD = 40; // px of travel before a drag counts as a swipe
		const TAP_MAX_MOVE = 12; // px of travel still treated as a tap
		let touchStartX = 0;
		let touchStartY = 0;
		const onTouchStart = (ev) => {
			const t = ev.touches[0];
			touchStartX = t.clientX;
			touchStartY = t.clientY;
			app.onEventHandler("mousemove", { ev: t });
		};
		const onTouchMove = (ev) => {
			ev.preventDefault(); // stop page scroll / pull-to-refresh
			app.onEventHandler("mousemove", { ev: ev.touches[0] });
		};
		const onTouchEnd = (ev) => {
			const t = ev.changedTouches[0];
			const dx = t.clientX - touchStartX;
			const dy = t.clientY - touchStartY;
			const origin = {
				x: t.clientX / window.innerWidth,
				y: 1 - t.clientY / window.innerHeight, // y-up, matching the shader
			};
			if (isPortrait) {
				if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx))
					app.navigate(dy < 0 ? 1 : -1, origin); // swipe up = next
				else if (Math.hypot(dx, dy) < TAP_MAX_MOVE)
					app.navigate(origin.y > 0.5 ? -1 : 1, origin); // tap top = prev
			} else {
				if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy))
					app.navigate(dx < 0 ? 1 : -1, origin); // swipe left = next
				else if (Math.hypot(dx, dy) < TAP_MAX_MOVE)
					app.navigate(origin.x < 0.5 ? -1 : 1, origin); // tap left = prev
			}
		};

		window.addEventListener("resize", onResize);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("click", onClick);
		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: false });
		window.addEventListener("touchend", onTouchEnd);

		let raf;
		const animate = () => {
			app.draw();
			raf = requestAnimationFrame(animate);
		};
		animate();

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", onResize);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("click", onClick);
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
			app.dispose?.();
			app = undefined;
		};
	});
</script>

<div class="title-container">
	{#key currentIndex}
		<div
			class="title-stack"
			style:--ang="{wipeAngle}deg"
			in:wipeIn={{ direction, vertical: isPortrait }}
			out:wipeOut={{ direction, vertical: isPortrait }}
		>
			<div class="title-layer">
				{#each heading as line}
					<h1 class="title">{line}</h1>
				{/each}
			</div>
			<div class="title-layer title-blur" aria-hidden="true">
				{#each heading as line}
					<h1 class="title">{line}</h1>
				{/each}
			</div>
		</div>
	{/key}
</div>

<canvas bind:this={canvas} id="canvas"></canvas>

<style>
	#canvas {
		display: block;
		position: fixed;
		inset: 0;
	}

	.title-container {
		background-color: #eee;
		position: absolute;
		top: 0;
		left: 50%;
		width: 100%;
		transform: translate(-50%, 0);
		height: 100svh;
		z-index: -1;
		text-align: center;
	}

	/* Drives the blurred seam; registered so it interpolates smoothly while the
	   wipe animates it. Off-screen (-100) at rest so no blur shows when idle. */
	@property --edge {
		syntax: "<number>";
		inherits: true;
		initial-value: -100;
	}

	/* Stacked so the outgoing and incoming titles overlap during the wipe. */
	.title-stack {
		position: absolute;
		inset: 0;
		--edge: -100;
		/* Half-width of the blurred band (% of the swept axis). */
		--band: 16;
		will-change: mask-image;
	}

	/* Sharp text + blurred duplicate occupy the same box, stacked. */
	.title-layer {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}

	/* Blurred copy, revealed only inside a gradient band riding the wipe edge,
	   so the blur is a linear gradient along the sweep direction — not the whole
	   word. The band fades to transparent on both sides of --edge. */
	.title-blur {
		filter: blur(14px);
		-webkit-mask-image: linear-gradient(
			var(--ang, 90deg),
			transparent calc((var(--edge) - var(--band)) * 1%),
			#000 calc(var(--edge) * 1%),
			transparent calc((var(--edge) + var(--band)) * 1%)
		);
		mask-image: linear-gradient(
			var(--ang, 90deg),
			transparent calc((var(--edge) - var(--band)) * 1%),
			#000 calc(var(--edge) * 1%),
			transparent calc((var(--edge) + var(--band)) * 1%)
		);
	}
</style>
