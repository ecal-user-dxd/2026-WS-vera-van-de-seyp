<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { app_two } from "$lib/three/app_two.js";
	import { attachControls } from "$lib/three/controls.js";
	import { loading } from "$lib/loading.js";
	import { wipeIn, wipeOut, wipeStyles } from "$lib/animation.js";

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
		// Touch only when the primary pointer is coarse (phones/tablets). Desktop
		// browsers expose "ontouchstart" too, so that check alone would wrongly
		// flag a mouse as touch and trigger the carousel slide on desktop.
		app.setTouch(window.matchMedia?.("(pointer: coarse)").matches ?? false);

		const detachControls = attachControls({
			app,
			canvas,
			getPortrait: () => isPortrait,
			setPortrait: (portrait) => (isPortrait = portrait),
			sourcesForViewport,
		});

		app.start();

		return () => {
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

<canvas bind:this={canvas} id="canvas" out:fade={{ duration: 400 }}></canvas>

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
