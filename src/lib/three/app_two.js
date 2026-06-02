import * as THREE from "three";
import { lerp } from "./utils.js";

// Bundled fallbacks: any artist with no thumbnail in the CMS gets a random
// one of these instead.
import fallbackA from "../assets/CleanShot 2026-06-01 at 15.44.25@2x.png";
import fallbackB from "../assets/CleanShot 2026-06-01 at 15.46.10@2x.png";
import { vertexShader } from "./shader/vertex.js";

const FALLBACK_IMAGES = [fallbackA, fallbackB];
const randomFallback = () =>
	FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
import { fragmentShader } from "./shader/fragment.js";
import { applyCarousel, loadTexture, textureSize } from "./texturesManager.js";
import { PARAMS } from "../PARAMS.js";

export const app_two = ({ canvas, images, startIndex = 0, onChange } = {}) => {
	const sources = (images && images.length ? images : [null]).map(
		(src) => src || randomFallback(),
	);

	const clock = new THREE.Clock();
	let elapsed = 0; // accumulated seconds, fed to uTime
	const mouse = {
		x: 0.5,
		y: 0.5,
		targetX: 0.5,
		targetY: 0.5,
	};

	let renderer;
	let scene;
	let camera;
	let material;
	let textures = [];
	const carousel = { center: startIndex % Math.max(sources.length, 1) };
	const reveal = { active: false, t: 0, dir: 1 };
	// Hover peek fade: ramps 0 -> 1 after a reveal so the peek eases back in.
	const hoverFade = { t: 1 };
	// Peek-slot crossfade: ramps 0 -> 1 so A/C texture swaps blend, not cut.
	const peekMix = { t: 1 };

	// Time-based transition parameters (seconds), independent of refresh rate.
	const { REVEAL_DURATION, HOVER_FADE_DURATION, PEEK_FADE_DURATION, MOUSE_SMOOTH } =
		PARAMS;

	async function init() {
		renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setClearColor(0x000000, 0); // transparent background
		renderer.setSize(window.innerWidth, window.innerHeight, false);
		scene = new THREE.Scene();
		camera = new THREE.Camera();
		textures = await Promise.all(sources.map(loadTexture));
		const center = textures[carousel.center];
		material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTextureA: { value: center },
				uTextureB: { value: center },
				uTextureC: { value: center },
				uResolution: { value: new THREE.Vector2() },
				uSizeA: { value: new THREE.Vector2(...textureSize(center)) },
				uSizeB: { value: new THREE.Vector2(...textureSize(center)) },
				uSizeC: { value: new THREE.Vector2(...textureSize(center)) },
				uMouse: { value: new THREE.Vector2(0.5, 0.5) },
				uTime: { value: 0 },
				uProgress: { value: 0 },
				uReveal: { value: 0 },
				uRevealDir: { value: 1 },
				uHoverFade: { value: 1 },
				// Peek-slot crossfade: prev source + size, and the 0->1 mix.
				uTextureAPrev: { value: center },
				uTextureCPrev: { value: center },
				uSizeAPrev: { value: new THREE.Vector2(...textureSize(center)) },
				uSizeCPrev: { value: new THREE.Vector2(...textureSize(center)) },
				uPeekMix: { value: 1 },
			},
		});
		applyCarousel(material, textures, carousel.center);
		const quad = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2, 64, 64),
			material,
		);
		quad.frustumCulled = false;
		scene.add(quad);
		resize(window.innerWidth, window.innerHeight);
	}

	function resize(w, h) {
		if (!renderer) return;
		renderer.setSize(w, h, false);
		const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
		material.uniforms.uResolution.value.copy(buffer);
	}

	function draw() {
		if (!material) return; // textures still loading
		// One getDelta() per frame — don't also call getElapsedTime(), which
		// would consume the delta a second time and desync both values.
		const delta = clock.getDelta();
		elapsed += delta;

		// Frame-rate-independent damping: same easing feel at 60 or 120 Hz.
		const smooth = 1 - Math.exp(-MOUSE_SMOOTH * delta);
		mouse.x = lerp(mouse.x, mouse.targetX, smooth);
		mouse.y = lerp(mouse.y, mouse.targetY, smooth);
		material.uniforms.uMouse.value.set(mouse.x, mouse.y);
		material.uniforms.uTime.value = elapsed;

		// Ease the hover peek back in after a reveal so it doesn't pop in abruptly.
		hoverFade.t = Math.min(hoverFade.t + delta / HOVER_FADE_DURATION, 1.0);
		material.uniforms.uHoverFade.value = hoverFade.t;

		// Crossfade the peek slots from their previous source to the new one.
		peekMix.t = Math.min(peekMix.t + delta / PEEK_FADE_DURATION, 1.0);
		material.uniforms.uPeekMix.value = peekMix.t;

		if (reveal.active) {
			// Radius that fully covers the screen from any click point (+feather).
			const res = material.uniforms.uResolution.value;
			const coverRadius = Math.hypot(res.x / res.y, 1.0) + 0.06;

			// Advance by elapsed time, so the reveal always takes REVEAL_DURATION.
			reveal.t = Math.min(reveal.t + delta / REVEAL_DURATION, 1.0);
			material.uniforms.uReveal.value = reveal.t * coverRadius;

			// At t === 1 the neighbour fully covers the screen, so swapping it in as
			// the new centre and collapsing is pixel-identical — no flash, no drop.
			if (reveal.t >= 1.0) {
				const n = textures.length;
				carousel.center = (carousel.center + reveal.dir + n) % n;
				// Stashes the old A/C sources into the prev slots, then swaps in
				// the new ones — the crossfade below blends between them.
				applyCarousel(material, textures, carousel.center);
				reveal.active = false;
				reveal.t = 0;
				material.uniforms.uReveal.value = 0;
				// Restart the hover peek + crossfade so A/C ease in from old -> new.
				hoverFade.t = 0;
				material.uniforms.uHoverFade.value = 0;
				peekMix.t = 0;
				material.uniforms.uPeekMix.value = 0;
				onChange?.(carousel.center);
			}
		}

		renderer.render(scene, camera);
	}

	function onEventHandler(type, event) {
		switch (type) {
			case "resize":
				resize(window.innerWidth, window.innerHeight);
				break;
			case "mousemove":
				mouse.targetX = event.ev.clientX / window.innerWidth;
				mouse.targetY = 1 - event.ev.clientY / window.innerHeight;
				break;
			case "click":
				// Advance toward the side that was clicked → prev / next artist.
				if (!reveal.active && textures.length > 1) {
					reveal.active = true;
					reveal.t = 0;
					reveal.dir = mouse.x < 0.5 ? -1 : 1;
					material.uniforms.uRevealDir.value = reveal.dir;
				}
				break;
		}
	}

	// Snap the centre to a given artist index without animation. Used to keep
	// the carousel in sync when the slug changes from outside (e.g. browser
	// back/forward). Does NOT fire onChange, to avoid a navigation loop.
	function jumpTo(index) {
		if (!material || !textures.length) return;
		const n = textures.length;
		const next = ((index % n) + n) % n;
		if (next === carousel.center) return;
		carousel.center = next;
		reveal.active = false;
		reveal.t = 0;
		material.uniforms.uReveal.value = 0;
		applyCarousel(material, textures, carousel.center);
		// Snap is instant: settle the crossfade so peeks show the new source.
		peekMix.t = 1;
		material.uniforms.uPeekMix.value = 1;
		hoverFade.t = 1;
		material.uniforms.uHoverFade.value = 1;
	}

	// Free GPU resources when the component using this instance unmounts.
	function dispose() {
		if (renderer) {
			renderer.dispose();
			renderer.forceContextLoss?.();
		}
		material?.dispose();
		for (const t of textures) t.dispose?.();
	}

	return {
		init,
		draw,
		onEventHandler,
		jumpTo,
		dispose,
	};
};
