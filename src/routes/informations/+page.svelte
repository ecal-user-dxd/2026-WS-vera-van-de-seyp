<script>
	import { fade } from "svelte/transition";
	import { loading } from "$lib/loading.js";

	let { data } = $props();

	// The loading store defaults to true (the artist page clears it once its
	// WebGL is ready). This page has nothing async to wait for, so on a direct
	// arrival we must clear it ourselves — otherwise the layout spinner would
	// cover the screen forever.
	loading.set(false);

	const description = $derived(
		data.infos?.description || data.infos?.seo_description || "",
	);
</script>

<main class="informations" transition:fade={{ duration: 400 }}>
	<div class="title-container">
		<div class="title-layer">
			<h1 class="title">Informations</h1>
		</div>
	</div>

	<div class="text">
		{#each description.split(/\n{2,}/) as paragraph}
			<p>{paragraph}</p>
		{/each}
	</div>
</main>

<style>
	.informations {
		position: fixed;
		inset: 0;
		background-color: #eee;
		color: #000;
		overflow-y: auto;
	}

	/* Mirrors the artist page: big serif lines pinned to the top and bottom
	   edges, spread by space-between, on the same #eee field. */
	.title-container {
		position: fixed;
		inset: 0;
		text-align: center;
		z-index: 0;
	}

	.title-layer {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}

	/* The description sits centred between the two titles. */
	.text {
		position: relative;
		z-index: 1;
		max-width: 48rem;
		margin: 0 auto;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 14rem 1.5rem;
		font-size: 1.5rem;
		line-height: 1.5;
	}

	.text p {
		font-family: "MONO", monospace;
		margin: 0 0 1.25rem;
	}

	.text p:last-child {
		margin-bottom: 0;
	}

	@media (max-width: 600px) {
		.text {
			padding: 7rem 1.25rem;
			font-size: 1.125rem;
		}
	}
</style>
