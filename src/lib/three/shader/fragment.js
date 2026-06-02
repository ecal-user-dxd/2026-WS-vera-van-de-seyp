export const fragmentShader = /* glsl */ `
	precision highp float;

	varying vec2 vUv;

	uniform sampler2D uTextureA;
	uniform sampler2D uTextureB;
    uniform sampler2D uTextureC;
	uniform sampler2D uTextureAPrev; // previous A source, crossfaded out
	uniform sampler2D uTextureCPrev; // previous C source, crossfaded out
	uniform vec2 uResolution; // canvas size, in pixels
	uniform vec2 uSizeA;      // image A size, in pixels
	uniform vec2 uSizeB;      // image B size, in pixels
    uniform vec2 uSizeC;      // image C size, in pixels
	uniform vec2 uSizeAPrev;  // previous A size, in pixels
	uniform vec2 uSizeCPrev;  // previous C size, in pixels
	uniform vec2 uMouse;      // normalised 0..1, y up
	uniform float uTime;      // seconds
	uniform float uProgress;  // 0 -> A, 1 -> B
	uniform float uReveal;    // 0 -> closed, 1 -> neighbour fills the screen
	uniform float uRevealDir; // -1 -> previous (A), +1 -> next (C)
	uniform float uHoverFade; // 0 -> hidden, 1 -> hover peek fully active
	uniform float uPeekMix;   // 0 -> previous A/C source, 1 -> new A/C source

	// "cover" mapping: fill the screen, preserve the image aspect ratio.
	vec2 coverUv(vec2 uv, vec2 imageSize) {
		vec2 s = uResolution / imageSize;
		float scale = max(s.x, s.y);
		vec2 size = imageSize * scale;
		vec2 offset = (uResolution - size) * 0.5;
		return (uv * uResolution - offset) / size;
	}

	void main() {
		// Peek slots crossfade from their previous source to the new one after a
		// carousel step, so swapping A/C textures eases in instead of cutting.
		vec4 a = mix(
			texture2D(uTextureAPrev, coverUv(vUv, uSizeAPrev)),
			texture2D(uTextureA, coverUv(vUv, uSizeA)),
			uPeekMix);
		vec4 c = mix(
			texture2D(uTextureCPrev, coverUv(vUv, uSizeCPrev)),
			texture2D(uTextureC, coverUv(vUv, uSizeC)),
			uPeekMix);
		// The centre image swaps seamlessly under the full-screen reveal.
		vec4 b = texture2D(uTextureB, coverUv(vUv, uSizeB));

        float aspect = uResolution.x / uResolution.y;
		vec2 p = vec2(vUv.x * aspect, vUv.y);          // aspect-corrected pixel
		vec2 m = vec2(uMouse.x * aspect, uMouse.y);    // aspect-corrected mouse
		float d = distance(p, m);

		// 0 inside the 0.3 - 0.7 band, ramps to 1 past the left/right thresholds.
		float edge = max(smoothstep(0.3, 0.0, uMouse.x), smoothstep(0.7, 1.0, uMouse.x));
		float feather = 0.05;

		// Which neighbour we're showing. Locked by the click direction while a
		// reveal is playing, otherwise chosen by the side the mouse is on.
		float dir = uReveal > 0.0 ? uRevealDir : (uMouse.x < 0.5 ? -1.0 : 1.0);
		vec4 spot = dir < 0.0 ? a : c;
		// Hover peek: a small circle that only appears past the side thresholds.
		// uHoverFade eases it back in after a reveal so it doesn't pop in abruptly.
		float hoverRadius = mix(0.0, 0.45, edge);
		float hoverHalo = (1.0 - smoothstep(hoverRadius - feather, hoverRadius + feather, d)) * edge * uHoverFade;

		// Click reveal: the circle grows from the cursor until it covers the screen.
		// uReveal is the radius itself (aspect-space units), set from JS.
		float revealRadius = uReveal;
		float revealHalo = (1.0 - smoothstep(revealRadius - feather, revealRadius + feather, d)) * step(0.00001, uReveal);

		float halo = max(hoverHalo, revealHalo);
		gl_FragColor = mix(b, spot, halo);         // b is always the centre image
		// ---------------------------------------------------------------------
	}
`;
