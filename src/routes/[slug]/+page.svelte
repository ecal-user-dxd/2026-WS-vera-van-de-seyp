<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { goto, beforeNavigate } from "$app/navigation";
	import { app_two } from "$lib/three/app_two.js";
	import { attachControls } from "$lib/three/controls.js";
	import { loading } from "$lib/loading.js";
	import { wipeIn, wipeOut, wipeStyles } from "$lib/animation.js";
	import ProjectInfo from "$lib/ProjectInfo.svelte";

	let { data } = $props();

	let canvas;
	let app;

	// Cursor-following info label (mouse devices only). x is normalised 0..1
	// across the width; px/py are the raw cursor coordinates it anchors to.
	let isTouch = $state(false);
	let pointer = $state({ x: 0.5, px: 0, py: 0 });
	const onPointerMove = (ev) => {
		pointer = {
			x: ev.clientX / window.innerWidth,
			px: ev.clientX,
			py: ev.clientY,
		};
	};

	// Cursor matches the info label's zones on mouse devices: a directional
	// resize cursor over prev/next, a pointer (hand) over the website zone.
	const cursor = $derived(
		isTouch
			? "auto"
			: pointer.x < 0.4
				? "w-resize"
				: pointer.x > 0.6
					? "e-resize"
					: "pointer",
	);

	// While the carousel canvas fades out (out:fade) on the way to another route,
	// the instance is still mounted and running. Block its onChange goto so a
	// reveal finishing mid-fade can't bounce us back to the last artist.
	let leaving = false;
	beforeNavigate((nav) => {
		if (nav.to?.route?.id !== nav.from?.route?.id) leaving = true;
	});

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
				if (leaving) return;
				currentIndex = index;
				goto(`/${data.artists[index].slug}`, {
					noScroll: true,
					keepFocus: true,
				});
			},
			onReady: () => loading.set(false),
			// Open the current artist's website in a new tab. Returns true when a
			// site was opened so touch taps can fall back to carousel navigation.
			onWebsite: () => {
				const site = data.artists[currentIndex]?.website;
				if (!site) return false;
				window.open(site, "_blank", "noopener,noreferrer");
				return true;
			},
		});
		app.init();
		app.setOrientation(isPortrait);
		// Touch only when the primary pointer is coarse (phones/tablets). Desktop
		// browsers expose "ontouchstart" too, so that check alone would wrongly
		// flag a mouse as touch and trigger the carousel slide on desktop.
		isTouch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
		app.setTouch(isTouch);

		const detachControls = attachControls({
			app,
			canvas,
			getPortrait: () => isPortrait,
			setPortrait: (portrait) => (isPortrait = portrait),
			sourcesForViewport,
		});

		app.start();

		// Desktop idle autoplay: after IDLE_MS without any input, advance to the
		// next project, then keep advancing every IDLE_MS until the visitor acts.
		// Any pointer/keyboard/scroll input resets the countdown. Touch devices
		// (kiosks aside, phones/tablets) are excluded — this is for unattended
		// desktop displays. Paused while the tab is hidden.
		const IDLE_MS = 5000;
		let idleTimer;
		const tickAutoplay = () => {
			if (app && !document.hidden) app.navigate(1, undefined, { auto: true });
			idleTimer = setTimeout(tickAutoplay, IDLE_MS);
		};
		const resetAutoplay = () => {
			clearTimeout(idleTimer);
			idleTimer = setTimeout(tickAutoplay, IDLE_MS);
		};
		const ACTIVITY = ["mousemove", "mousedown", "wheel", "keydown"];
		let detachAutoplay = () => {};
		if (!isTouch) {
			for (const type of ACTIVITY)
				window.addEventListener(type, resetAutoplay, { passive: true });
			document.addEventListener("visibilitychange", resetAutoplay);
			resetAutoplay();
			detachAutoplay = () => {
				clearTimeout(idleTimer);
				for (const type of ACTIVITY)
					window.removeEventListener(type, resetAutoplay);
				document.removeEventListener("visibilitychange", resetAutoplay);
			};
		}

		return () => {
			detachAutoplay();
			detachControls();
			app.dispose?.();
			app = undefined;
		};
	});
</script>

<svelte:head>
	{@html `<style>${wipeStyles}</style>`}
</svelte:head>

<div class="title-container">
	{#key currentIndex}
		<div
			class="title-stack"
			style:--ang="{wipeAngle}deg"
			in:wipeIn={{ direction, vertical: isPortrait }}
			out:wipeOut={{ direction, vertical: isPortrait }}
		>
			<!-- <div class="title-layer">
				{#each heading as line}
					<h1 class="title">{line}</h1>
				{/each}
			</div>
			<div class="title-layer title-blur" aria-hidden="true">
				{#each heading as line}
					<h1 class="title">{line}</h1>
				{/each}
			</div> -->
		</div>
	{/key}
</div>

<canvas bind:this={canvas} id="canvas" style:cursor out:fade={{ duration: 400 }}
></canvas>

<svelte:window onmousemove={onPointerMove} />

<ProjectInfo x={pointer.x} px={pointer.px} py={pointer.py} visible={!isTouch} />

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

	.title-layer {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}
</style>
