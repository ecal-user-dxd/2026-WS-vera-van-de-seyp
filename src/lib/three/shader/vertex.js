export const vertexShader = /* glsl */ `
	uniform float uBend;     // 0 -> flat, 1 -> full spherical bulge
	uniform float uRotation; // radians, spins the quad around its center
	uniform vec2 uDrag;      // clip-space follow-the-finger offset (touch)
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

		// Spin around the center. The shader bypasses modelMatrix, so quad.rotation
		// has no effect — we apply the rotation here instead.
		float c = cos(uRotation);
		float s = sin(uRotation);
		xy = mat2(c, -s, s, c) * xy;

		// Slide the whole quad under the finger during a touch drag. Eased back to
		// zero on release (see app_two), so it springs to centre as the reveal plays.
		xy += uDrag;

		gl_Position = vec4(xy, 0.0, 1.0);
	}
`;
