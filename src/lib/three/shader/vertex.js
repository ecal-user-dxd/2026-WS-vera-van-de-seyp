export const vertexShader = /* glsl */ `
	uniform vec2 uMouse;
	uniform float uAxis; // 0 -> horizontal (left/right), 1 -> vertical (top/bottom)
	varying vec2 vUv;
	void main() {
		vUv = uv;

		// Spherical bulge: flat at the center, rounding into a sphere as the
		// pointer approaches the edges — left/right in landscape, top/bottom in
		// portrait so the bend follows the swipe axis.
		vec2 xy = position.xy;                    // [-1, 1]
		// Pointer position along the active axis: x when horizontal, y when vertical.
		float coord = uAxis < 0.5 ? uMouse.x : uMouse.y;
		// 0 inside the 0.3 - 0.7 band, ramps to 1 past the edge thresholds.
		float edge = max(smoothstep(0.3, 0.0, coord), smoothstep(0.7, 1.0, coord));
		float r = length(xy);                     // distance from center
		float warp = 1.0 - edge * 0.3 * r * r;
		xy *= warp;

		gl_Position = vec4(xy, 0.0, 1.0);
	}
`;
