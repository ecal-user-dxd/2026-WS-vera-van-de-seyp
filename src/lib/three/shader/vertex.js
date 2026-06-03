export const vertexShader = /* glsl */ `
	uniform float uBend; // 0 -> flat, 1 -> full spherical bulge
	varying vec2 vUv;
	void main() {
		vUv = uv;

		// Spherical bulge: flat at the center, rounding into a sphere as uBend
		// rises. The amount is driven from JS — by the pointer's distance to the
		// edges on desktop, or pulsed once per transition on touch devices.
		vec2 xy = position.xy;                    // [-1, 1]
		float r = length(xy);                     // distance from center
		float warp = 1.0 - uBend * 0.3 * r * r;
		xy *= warp;

		gl_Position = vec4(xy, 0.0, 1.0);
	}
`;
