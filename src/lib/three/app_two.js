import * as THREE from "three";
import { lerp } from "./utils.js";

// GLSL-style smoothstep: 0 below e0, 1 above e1, eased Hermite in between.
const smoothstep = (e0, e1, x) => {
	const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
	return t * t * (3 - 2 * t);
};

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

export const app_two = ({ canvas, images, startIndex = 0, onChange, onReady } = {}) => {
	// Normalise an images array into renderable sources: empty list → one
	// fallback, and any missing entry → a random fallback image.
	const normalizeSources = (imgs) =>
		(imgs && imgs.length ? imgs : [null]).map((src) => src || randomFallback());

	let sources = normalizeSources(images);


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
	// Distinct loaded textures, so dispose() frees each once even while several
	// `textures` slots still point at a placeholder during background loading.
	const loaded = new Set();
	// Bumped whenever the source set changes (setImages). In-flight loads check
	// it and bail if a newer load has superseded them.
	let generation = 0;
	const carousel = { center: startIndex % Math.max(sources.length, 1) };
	const reveal = { active: false, t: 0, dir: 1 };
	// Navigation axis: 0 = horizontal (landscape, left/right), 1 = vertical
	// (portrait, top/bottom). Set from the component via setOrientation.
	let axis = 0;
	// Touch devices have no hover, so the vertex bend is pulsed once per
	// transition instead of following the pointer. Set via setTouch.
	let touchMode = false;
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

		// Load only what the first paint needs — the centred artist plus its
		// left/right neighbours — so the loader can clear ASAP. The remaining
		// sources stream in afterwards (see loadRemaining), in time for the
		// next navigation. Until a slot loads it points at the centre texture.
		const n = sources.length;
		const c = carousel.center;
		const priority = [...new Set([c, (c - 1 + n) % n, (c + 1) % n])];
		textures = new Array(n);
		await Promise.all(
			priority.map(async (i) => {
				const tex = await loadTexture(sources[i]);
				textures[i] = tex;
				loaded.add(tex);
			}),
		);
		const center = textures[carousel.center];
		// Fill not-yet-loaded slots with the centre texture so applyCarousel and
		// the shader always have a valid sampler; loadRemaining swaps in the real
		// ones as they arrive.
		for (let i = 0; i < n; i++) if (!textures[i]) textures[i] = center;
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
				uAxis: { value: axis },
				uBend: { value: 0 },
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

		// The visible three are ready — clear the loader, then stream the rest.
		onReady?.();
		loadRemaining(priority);
	}

	// Load every source not already loaded (the priority three are skipped) and
	// swap each into its slot. These aren't visible until the carousel advances,
	// by which point the slot holds the real texture instead of the placeholder.
	async function loadRemaining(skip) {
		const gen = generation;
		const mySources = sources;
		const skipSet = new Set(skip);
		for (let i = 0; i < mySources.length; i++) {
			if (skipSet.has(i)) continue;
			const tex = await loadTexture(mySources[i]);
			// Bail if the instance was disposed or the source set was swapped.
			if (!material || gen !== generation) {
				tex.dispose?.();
				return;
			}
			textures[i] = tex;
			loaded.add(tex);
		}
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

		// Vertex bend. On touch there's no hover, so it pulses once per transition
		// (0 at the start, peaks mid-reveal, back to 0 at the end). On pointer
		// devices it tracks the cursor's distance to the edges along the active
		// axis, bulging as it nears them — the same hover bulge as before.
		let bend;
		if (touchMode) {
			bend = reveal.active ? Math.sin(reveal.t * Math.PI) : 0;
		} else {
			const coord = axis === 1 ? mouse.y : mouse.x;
			bend = Math.max(smoothstep(0.3, 0.0, coord), smoothstep(0.7, 1.0, coord));
		}
		material.uniforms.uBend.value = bend;

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
				// Advance toward the side/half that was clicked → prev / next artist.
				// Horizontal: left = prev. Vertical: top = prev (mouse.y is y-up).
				navigate(axis === 1 ? (mouse.y > 0.5 ? -1 : 1) : (mouse.x < 0.5 ? -1 : 1));
				break;
		}
	}

	// Start a reveal toward `dir` (-1 prev, +1 next). Optionally snap the reveal
	// origin (normalised, y up) to a point so a swipe's circle grows from the
	// finger rather than the last smoothed pointer position. Ignored mid-reveal.
	function navigate(dir, origin) {
		if (!material || reveal.active || textures.length <= 1) return;
		if (origin) {
			mouse.x = mouse.targetX = origin.x;
			mouse.y = mouse.targetY = origin.y;
			material.uniforms.uMouse.value.set(mouse.x, mouse.y);
		}
		reveal.active = true;
		reveal.t = 0;
		reveal.dir = dir;
		material.uniforms.uRevealDir.value = dir;
	}

	// Switch the navigation axis: portrait swipes top↔bottom, landscape goes
	// left↔right. Stores the flag even before init builds the material.
	function setOrientation(isPortrait) {
		axis = isPortrait ? 1 : 0;
		if (material) material.uniforms.uAxis.value = axis;
	}

	// Mark whether the device is touch (no hover). When true, the vertex bend is
	// pulsed once per transition instead of following the pointer.
	function setTouch(isTouch) {
		touchMode = !!isTouch;
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

	// Swap in a new set of sources (e.g. the vertical variants when the viewport
	// flips to portrait) without recreating the renderer. Reloads the textures,
	// snaps the carousel to the new ones at the current centre, and disposes the
	// old ones once the new textures are bound.
	async function setImages(nextImages) {
		if (!material) return;
		const next = normalizeSources(nextImages);
		// Supersede any in-flight load (initial background fill or a prior swap).
		const gen = ++generation;
		const nextTextures = await Promise.all(next.map(loadTexture));
		// Bail if disposed or superseded by a newer setImages while loading.
		if (!material || gen !== generation) {
			for (const t of nextTextures) t.dispose?.();
			return;
		}
		// Dispose the textures the old set owned, then track the new ones.
		for (const t of loaded) t.dispose?.();
		loaded.clear();
		for (const t of nextTextures) loaded.add(t);
		sources = next;
		textures = nextTextures;
		const n = textures.length;
		carousel.center = ((carousel.center % n) + n) % n;
		// Cancel any in-flight reveal so the swap is a clean snap.
		reveal.active = false;
		reveal.t = 0;
		material.uniforms.uReveal.value = 0;
		applyCarousel(material, textures, carousel.center);
		// Point the crossfade "prev" slots at the new sources too, so nothing
		// keeps referencing the old textures we're about to dispose, then settle
		// the crossfade/hover so the new sources show immediately (no blend).
		const u = material.uniforms;
		u.uTextureAPrev.value = u.uTextureA.value;
		u.uTextureCPrev.value = u.uTextureC.value;
		u.uSizeAPrev.value.copy(u.uSizeA.value);
		u.uSizeCPrev.value.copy(u.uSizeC.value);
		peekMix.t = 1;
		u.uPeekMix.value = 1;
		hoverFade.t = 1;
		u.uHoverFade.value = 1;
	}

	// Free GPU resources when the component using this instance unmounts.
	function dispose() {
		if (renderer) {
			renderer.dispose();
			renderer.forceContextLoss?.();
		}
		material?.dispose();
		material = null; // also makes the in-flight-load guards fire
		generation++; // cancel any background/swap load still in flight
		for (const t of loaded) t.dispose?.();
		loaded.clear();
	}

	return {
		init,
		draw,
		onEventHandler,
		navigate,
		setOrientation,
		setTouch,
		jumpTo,
		setImages,
		dispose,
	};
};
