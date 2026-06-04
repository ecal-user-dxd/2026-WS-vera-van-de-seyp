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
	uniform float uAxis;      // 0 -> horizontal (left/right), 1 -> vertical (top/bottom)
	uniform float uSlide;     // touch carousel: 0 -> centre, 1 -> neighbour slid fully in
	uniform float uSlideDir;  // -1 -> previous (A), +1 -> next (C)

	// "cover" mapping: fill the screen, preserve the image aspect ratio.
	vec2 coverUv(vec2 uv, vec2 imageSize) {
		vec2 s = uResolution / imageSize;
		float scale = max(s.x, s.y);
		vec2 size = imageSize * scale;
		vec2 offset = (uResolution - size) * 0.5;
		return (uv * uResolution - offset) / size;
	}

	void main() {
		// Touch carousel: the centre image slides fully off one edge while the
		// neighbour enters from the opposite edge, the whole screen moving as a
		// strip. Driven by uSlide (0..1); bypasses the desktop hover/reveal path.
		if (uSlide > 0.0) {
			// Axis coordinate that moves under the swipe (x landscape, y portrait).
			float c = uAxis < 0.5 ? vUv.x : vUv.y;
			// Content displacement direction per axis: navigate(+1)=next slides the
			// image left in landscape (-x) but up in portrait (+y), so the sign flips.
			float sgn = uAxis < 0.5 ? -uSlideDir : uSlideDir;
			float curC = c - sgn * uSlide; // where the centre image is sampled
			float neiC = curC + sgn;       // neighbour, one screen toward the entry edge
			vec2 curUv = uAxis < 0.5 ? vec2(curC, vUv.y) : vec2(vUv.x, curC);
			vec2 neiUv = uAxis < 0.5 ? vec2(neiC, vUv.y) : vec2(vUv.x, neiC);
			vec4 cur = texture2D(uTextureB, coverUv(curUv, uSizeB));
			// Next slides in C (right/below), previous slides in A (left/above).
			vec4 nei = uSlideDir < 0.0
				? texture2D(uTextureA, coverUv(neiUv, uSizeA))
				: texture2D(uTextureC, coverUv(neiUv, uSizeC));
			// Hard cut at the screen edge: once the centre has left [0,1], show the
			// neighbour that has taken that part of the screen.
			gl_FragColor = (curC < 0.0 || curC > 1.0) ? nei : cur;
			return;
		}

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

		// Pointer position along the active axis: x when horizontal, y when vertical.
		float coord = uAxis < 0.5 ? uMouse.x : uMouse.y;
		// 0 inside the 0.3 - 0.7 band, ramps to 1 past the edge thresholds.
		float edge = max(smoothstep(0.3, 0.0, coord), smoothstep(0.7, 1.0, coord));
		float feather = 0.05;

		// Which neighbour we're showing. Locked by the click/swipe direction while a
		// reveal is playing, otherwise chosen by the side/half the pointer is on.
		// Horizontal: left = prev. Vertical: top = prev (note uMouse.y is y-up).
		float side = uAxis < 0.5
			? (uMouse.x < 0.5 ? -1.0 : 1.0)
			: (uMouse.y > 0.5 ? -1.0 : 1.0);
		float dir = uReveal > 0.0 ? uRevealDir : side;
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
