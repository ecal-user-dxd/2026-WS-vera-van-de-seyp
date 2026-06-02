// Tunable transition parameters. All durations are in seconds, so the
// animations are time-based and look identical at any refresh rate.
export const PARAMS = {
	REVEAL_DURATION: 0.25, // time for one carousel reveal to complete
	HOVER_FADE_DURATION: 0.5, // time for the hover peek to ease back in after a reveal
	PEEK_FADE_DURATION: 0.5, // time for the A/C peek textures to crossfade old -> new
	MOUSE_SMOOTH: 8, // exponential damping rate; higher = mouse follows faster
};
