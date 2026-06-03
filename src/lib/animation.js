import { cubicInOut } from "svelte/easing";

// Duration of a title wipe, in ms. Shared by the in/out transitions so the old
// and new word sweep in lockstep.
const DURATION = 10000;

const FEATHER = 0.3;

export function wipeCss(progress, direction, vertical, reveal) {
	const edge = -FEATHER + progress * (100 + 2 * FEATHER);
	const side = vertical
		? direction === -1
			? "to bottom"
			: "to top"
		: direction === 1
			? "to right"
			: "to left";
	const stops = reveal
		? `black ${edge - FEATHER}%, transparent ${edge + FEATHER}%`
		: `transparent ${edge - FEATHER}%, black ${edge + FEATHER}%`;
	const mask = `linear-gradient(${side}, ${stops})`;
	return `--edge: ${edge}; -webkit-mask-image: ${mask}; mask-image: ${mask};`;
}

// Outgoing word: t runs 1 → 0, so the global sweep progress is 1 - t.
export function wipeOut(node, { direction = 1, vertical = false } = {}) {
	return {
		duration: DURATION,
		easing: cubicInOut,
		css: (t) => wipeCss(1 - t, direction, vertical, false),
	};
}

// Incoming word: t runs 0 → 1, matching the global sweep progress.
export function wipeIn(node, { direction = 1, vertical = false } = {}) {
	return {
		duration: DURATION,
		easing: cubicInOut,
		css: (t) => wipeCss(t, direction, vertical, true),
	};
}

// Wipe-related styles, injected globally by the title component. The blur
// amount lives in `.title-blur`; the band width is `--band` on `.title-stack`.
// `--edge` is exposed by wipeCss() each frame and rides the blurred seam.
export const wipeStyles = `
	@property --edge {
		syntax: "<number>";
		inherits: true;
		initial-value: -100;
	}

	.title-stack {
		position: absolute;
		inset: 0;
		--edge: -100;
		--band: 16;
		will-change: mask-image;
	}

	.title-blur {
		filter: blur(14px);
		-webkit-mask-image: linear-gradient(
			var(--ang, 90deg),
			transparent calc((var(--edge) - var(--band)) * 1%),
			#000 calc(var(--edge) * 1%),
			transparent calc((var(--edge) + var(--band)) * 1%)
		);
		mask-image: linear-gradient(
			var(--ang, 90deg),
			transparent calc((var(--edge) - var(--band)) * 1%),
			#000 calc(var(--edge) * 1%),
			transparent calc((var(--edge) + var(--band)) * 1%)
		);
	}
`;
