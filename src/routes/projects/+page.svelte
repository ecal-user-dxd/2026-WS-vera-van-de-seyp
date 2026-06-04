<script>
	import { onMount } from "svelte";
	import { loading } from "$lib/loading.js";

	let { data } = $props();

	// Treat video files (.webm/.mp4/...) differently from images, matching the
	// extension check the texture loader uses.
	const VIDEO_RE = /\.(mp4|webm|ogv|mov)(\?.*)?$/i;
	const isVideo = (src) => VIDEO_RE.test(src ?? "");

	onMount(() => {
		// Static grid — nothing to load asynchronously, so clear the loader at once.
		loading.set(false);

		// This route scrolls (the global layout pins overflow: hidden for the
		// full-screen carousel). Restore on unmount so other routes stay pinned.
		document.documentElement.style.overflow = "auto";
		document.body.style.overflow = "auto";

		return () => {
			document.documentElement.style.overflow = "";
			document.body.style.overflow = "";
		};
	});
</script>

<div class="grid">
	{#each data.artists as artist}
		<a class="cell" href="/{artist.slug}">
			{#if artist.file && isVideo(artist.file)}
				<video
					class="media"
					src={artist.file}
					muted
					loop
					autoplay
					playsinline
				></video>
			{:else if artist.file}
				<img class="media" src={artist.file} alt="" loading="lazy" />
			{:else}
				<div class="media placeholder"></div>
			{/if}
			<span class="caption">
				{[artist.name, artist.surname].filter(Boolean).join(" ") ||
					artist.title}
			</span>
		</a>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		/* Clear the fixed navigation bar at the top. */
		padding: 4rem 1rem 1rem;
		box-sizing: border-box;
	}

	.cell {
		display: block;
		position: relative;
		aspect-ratio: 4 / 3;
		text-decoration: none;
		overflow: hidden;
	}

	.media {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		/* Desaturated at rest, full color on hover — echoes the carousel's look. */
		filter: grayscale(1);
		transition: filter 0.4s ease;
	}

	.placeholder {
		background: #ddd;
	}

	.cell:hover .media {
		filter: grayscale(0);
	}

	.caption {
		position: absolute;
		left: 0.5rem;
		bottom: 0.5rem;
		color: white;
		font-family: "Times New Roman", Times, serif;
		mix-blend-mode: difference;
		pointer-events: none;
	}

	@media (orientation: portrait) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
