<script>
	import "../app.css";
	import { loading } from "$lib/loading.js";
	import Navigation from "../lib/Navigation.svelte";

	let { children } = $props();
</script>

{#if $loading}
	<div class="loader" role="status" aria-label="Loading">
		<span class="spinner"></span>
	</div>
{/if}

<div class="layout-container">
	<Navigation />
</div>
{@render children()}

<style>
	.loader {
		position: fixed;
		inset: 0;
		z-index: 10;
		display: grid;
		place-items: center;
		background: #eee;
	}

	.spinner {
		width: 2.5rem;
		height: 2.5rem;
		border: 2px solid #0003;
		border-top-color: #000;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
