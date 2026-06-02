export const vertexShader = /* glsl */ `
	uniform vec2 uMouse;
	varying vec2 vUv;
	void main() {
		vUv = uv;

		// Spherical bulge: flat at the center, rounding into a sphere as the
		// mouse approaches the left/right edges.
		vec2 xy = position.xy;                    // [-1, 1]
		// 0 inside the 0.3 - 0.7 band, ramps to 1 past the left/right thresholds.
		float edge = max(smoothstep(0.3, 0.0, uMouse.x), smoothstep(0.7, 1.0, uMouse.x));
		float r = length(xy);                     // distance from center
		float warp = 1.0 - edge * 0.3 * r * r;
		xy *= warp;

		gl_Position = vec4(xy, 0.0, 1.0);
	}
`;
