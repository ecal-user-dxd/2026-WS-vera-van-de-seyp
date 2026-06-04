<script>
	// Contextual hint that follows the cursor on mouse (non-touch) devices,
	// telling the viewer what a click in the zone they're hovering will do:
	//   x < 0.4        → previous project
	//   0.4 ≤ x ≤ 0.6  → go on the website (label only for now)
	//   x > 0.6        → next project
	// x is the pointer position normalised to 0..1 across the viewport width;
	// px / py are the raw cursor coordinates (px) the label is anchored to.
	let { x = 0.5, px = 0, py = 0, visible = false } = $props();

	const label = $derived(
		x < 0.4 ? "prev. project" : x > 0.6 ? "next project" : "go on the website",
	);
</script>

{#if visible}
	<div
		class="project-info"
		style:left="{px}px"
		style:top="{py}px"
		aria-hidden="true"
	>
		{label}
	</div>
{/if}

<style>
	.project-info {
		position: fixed;
		font-family: "MONO", monospace;
		/* Sit just to the right of the cursor, vertically centred on it. */
		transform: translate(-50%, -100%);
		pointer-events: none;
		z-index: 10;
		white-space: nowrap;
		font-size: 0.85rem;
		letter-spacing: 0.02em;
		text-transform: lowercase;
		/* Readable over any image underneath, whatever its colour. */
		mix-blend-mode: difference;
		color: #fff;
	}
</style>
