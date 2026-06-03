<script>
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { cubicInOut } from "svelte/easing";
	import { app_two } from "$lib/three/app_two.js";
	import { loading } from "$lib/loading.js";

	let { data } = $props();

	let canvas;
	let app;

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
			direction = currentIndex > prevIndex ? 1 : -1;
			prevIndex = currentIndex;
		}
	});

	const DURATION = 800;
	// Peak blur applied while a title is mid-transition.
	const MAX_BLUR = 14;
	// How far a title slides (% of the swept axis) as it enters/leaves.
	const SHIFT = 12;
	// Width of the soft trailing-edge feather (% of the swept axis).
	const FEATHER = 35;

	// Both titles transition at once and overlap: the outgoing one blurs, fades
	// (opacity) and slides out while the incoming one blurs, fades and slides in
	// from the opposite side — so for a moment you see both. A soft directional
	// gradient mask feathers the leaving edge so the dissolve reads as a wipe.
	// `t` is this title's own presence: 1 = fully here, 0 = fully gone.
	// Landscape sweeps horizontally, portrait vertically, mirrored by `direction`.
	function wipeCss(t, direction, vertical, reveal) {
		const gone = 1 - t;
		const blur = gone * MAX_BLUR;
		// New enters from -direction, old exits toward +direction (one shared flow).
		const offset = gone * SHIFT * direction * (reveal ? -1 : 1);
		const translate = vertical
			? `translateY(${offset}%)`
			: `translateX(${offset}%)`;
		const side = vertical
			? direction === -1
				? "to top"
				: "to bottom"
			: direction === 1
				? "to left"
				: "to right";
		// Feather the trailing edge; grows as the title leaves, keeps it gradient-y
		// without fully hiding (opacity carries most of the fade so both stay visible).
		const fade = gone * FEATHER;
		const mask = `linear-gradient(${side}, transparent 0%, black ${fade}%, black 100%)`;
		return `opacity: ${t}; filter: blur(${blur}px); transform: ${translate}; -webkit-mask-image: ${mask}; mask-image: ${mask};`;
	}

	function wipeOut(node, { direction = 1, vertical = false } = {}) {
		return {
			duration: DURATION,
			easing: cubicInOut,
			// t runs 1 → 0 (present → gone).
			css: (t) => wipeCss(t, direction, vertical, false),
		};
	}

	function wipeIn(node, { direction = 1, vertical = false } = {}) {
		return {
			duration: DURATION,
			easing: cubicInOut,
			// t runs 0 → 1 (gone → present).
			css: (t) => wipeCss(t, direction, vertical, true),
		};
	}

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
			in:wipeIn={{ direction, vertical: isPortrait }}
			out:wipeOut={{ direction, vertical: isPortrait }}
		>
			{#each heading as line}
				<h1 class="title">{line}</h1>
			{/each}
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

	/* Stacked so the outgoing and incoming titles overlap during the wipe. */
	.title-stack {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		will-change: clip-path;
	}
</style>
