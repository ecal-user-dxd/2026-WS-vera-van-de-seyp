<script>
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { app_two } from "$lib/three/app_two.js";
	import { loading } from "$lib/loading.js";

	let { data } = $props();

	let canvas;
	let app;

	// The carousel is the source of truth for what's on screen; the URL/title
	// follow it. We track the centred index locally for instant title updates.
	// Seeded once from the loaded slug, then kept in sync by onChange/$effect.
	// svelte-ignore state_referenced_locally
	let currentIndex = $state(data.index);

	const current = $derived(data.artists[currentIndex]);
	const heading = $derived(
		current?.name || current?.surname
			? [current.name, current.surname].filter(Boolean)
			: [current?.title ?? ""],
	);

	// Keep the carousel in sync when the slug changes from outside the carousel
	// (browser back/forward, deep links). The guard makes carousel-driven
	// navigation a no-op here, so there's no feedback loop.
	$effect(() => {
		if (app && data.index !== currentIndex) {
			currentIndex = data.index;
			app.jumpTo(data.index);
		}
	});

	onMount(() => {
		// Show the loader until the carousel reports the first videos are ready.
		loading.set(true);

		canvas.style.width = window.innerWidth + "px";
		canvas.style.height = window.innerHeight + "px";

		// Portrait viewports use each artist's vertical source when it exists,
		// falling back to the horizontal `file` otherwise. Tracked so we can
		// reload the sources live when the viewport flips orientation.
		let isPortrait = window.innerHeight > window.innerWidth;
		const sourcesForViewport = () =>
			data.artists.map(
				(a) => (isPortrait ? a.vertical_file : a.file) || a.file,
			);

		app = app_two({
			canvas,
			images: sourcesForViewport(),
			startIndex: data.index,
			// Each advance changes the artist → reflect it in the URL + title.
			onChange: (index) => {
				currentIndex = index;
				goto(`/${data.artists[index].slug}`, {
					noScroll: true,
					keepFocus: true,
				});
			},
			// Centre + left/right textures are ready → hide the loader.
			onReady: () => loading.set(false),
		});
		app.init();

		const onResize = (ev) => {
			canvas.style.width = window.innerWidth + "px";
			canvas.style.height = window.innerHeight + "px";
			app.onEventHandler("resize", {
				ev,
				width: window.innerWidth,
				height: window.innerHeight,
			});
			// Crossing the square boundary flips orientation → reload the matching
			// (vertical vs horizontal) sources.
			const portrait = window.innerHeight > window.innerWidth;
			if (portrait !== isPortrait) {
				isPortrait = portrait;
				app.setImages(sourcesForViewport());
			}
		};
		const onMouseMove = (ev) => app.onEventHandler("mousemove", { ev });
		const onClick = (ev) => app.onEventHandler("click", { ev });

		window.addEventListener("resize", onResize);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("click", onClick);

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
			app.dispose?.();
			app = undefined;
		};
	});
</script>

<div class="title-container">
	{#each heading as line}
		<h1 class="title">{line}</h1>
	{/each}
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
		height: 100vh;
		z-index: -1;
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}
</style>
