// Half-width of the soft wipe edge (% of the swept axis). Small, so there is a
// clear sweeping edge (a real wipe) with just a soft seam where the old and new
// words briefly meet. The blurred seam itself is built in CSS from --edge.
const FEATHER = 0.1;

// A single soft edge sweeps the whole axis, shared by both titles so their edges
// stay aligned: ahead of it the old word shows, behind it the new one. The blur
// is NOT applied to the whole word — this exposes the edge position as --edge,
// and a blurred duplicate layer is masked to a gradient band riding that edge
// (see .title-blur), so only the moving seam is blurry.
// `progress` is the global 0 → 1 sweep; `reveal` is the incoming word.
// Landscape sweeps horizontally, portrait vertically, mirrored by `direction`.
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
