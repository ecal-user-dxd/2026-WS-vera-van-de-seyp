<script>
	import { derived } from "svelte/store";
	import { onNavigate } from "$app/navigation";

	import { page } from "$app/stores";
	let route = $page.url.pathname;
	onNavigate(() => {
		console.log("Navigated to:", window.location.pathname);
		route = window.location.pathname;
	});
	console.log("Current route:", route);
</script>

<div class="navigation-container">
	<nav>
		{#if route === "/projects"}
			<a href="/">Back</a>
			<a href="/informations">Informations</a>
		{:else if route === "/informations"}
			<!-- <a href="/projects">Index</a> -->
			<a href="/">Back</a>
		{:else}
			<!-- <a href="/projects">Index</a> -->
			<a href="/informations">Informations</a>
		{/if}
	</nav>
</div>

<style>
	.navigation-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		padding: 1rem;
		z-index: 20;
	}

	@media (orientation: portrait) {
		.navigation-container {
			display: none;
		}
	}

	nav {
		display: flex;
		justify-content: space-between;
	}
	a {
		font-family: "MONO", monospace;
		text-decoration: none;
		color: black;
		filter: difference(1) drop-shadow(0 0 0.5px black);
	}
</style>
