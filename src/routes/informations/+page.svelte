<script>
	import { fade } from "svelte/transition";

	let { data } = $props();

	const description = $derived(
		data.infos?.description || data.infos?.seo_description || "",
	);
</script>

<main class="informations" transition:fade={{ duration: 400 }}>
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
		display: grid;
		place-items: center;
		overflow-y: auto;
		padding: 6rem 1.5rem;
	}

	.text {
		max-width: 48rem;
		font-size: 1.5rem;
		line-height: 1.5;
		color: #000;
	}

	.text p {
		margin: 0 0 1.25rem;
	}

	.text p:last-child {
		margin-bottom: 0;
	}
</style>
