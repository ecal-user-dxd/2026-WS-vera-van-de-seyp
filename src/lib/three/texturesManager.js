import * as THREE from "three";

// Bundled fallback shown when a source fails to load or a codec is unsupported
// (notably: Safari iOS cannot decode WebM). Keeps the carousel — and the loading
// screen that waits on it — from hanging on an unresolvable source.
import fallbackImage from "../assets/CleanShot 2026-06-01 at 15.44.25@2x.png";

// How long to wait for a video to report its first frame before giving up and
// falling back. Covers stalled network loads and iOS's silent WebM refusal.
const VIDEO_LOAD_TIMEOUT_MS = 12000;

// ---- Texture manager -------------------------------------------------------
// Reusable, stateless helpers for loading and measuring textures, plus the
// carousel slot mapping. Everything here depends only on its arguments, so it
// can be shared by any instance — state (material, textures, …) is passed in.

// A 1x1 transparent texture — the last-resort source when even the bundled
// fallback image fails, so a load always resolves and the loader can clear.
function placeholderTexture() {
	const tex = new THREE.DataTexture(
		new Uint8Array([0, 0, 0, 0]),
		1,
		1,
		THREE.RGBAFormat,
	);
	tex.needsUpdate = true;
	return tex;
}

// Intrinsic pixel size of a texture, whether it wraps an image or a video.
export function textureSize(texture) {
	const src = texture.image;
	const w = src.videoWidth || src.naturalWidth || src.width || 1;
	const h = src.videoHeight || src.naturalHeight || src.height || 1;
	return [w, h];
}

export function loadImageTexture(url) {
	return new Promise((resolve, reject) => {
		new THREE.TextureLoader().load(
			url,
			(texture) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.minFilter = THREE.LinearFilter;
				resolve(texture);
			},
			undefined,
			// Without this handler a failed image (404 / CORS / network) would leave
			// the promise pending forever and hang everything awaiting it.
			() => reject(new Error(`image load failed: ${url}`)),
		);
	});
}

export function loadVideoTexture(url) {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		video.src = url;
		video.loop = true;
		video.muted = true; // required for autoplay without a user gesture
		video.playsInline = true;
		video.crossOrigin = "anonymous";

		// Settle exactly once, then tear down the timer/listeners.
		let settled = false;
		const settle = (fn, arg) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			fn(arg);
		};

		// Wait for dimensions to be known, then start playing.
		video.addEventListener("loadeddata", () => {
			// play() can reject (autoplay policy); the texture still updates once
			// frames arrive, so don't let a rejected play() break loading.
			video.play?.().catch(() => {});
			const texture = new THREE.VideoTexture(video); // auto-updates each frame
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.minFilter = THREE.LinearFilter;
			settle(resolve, texture);
		});
		// Unsupported codec (Safari iOS + WebM) or a network error fires this — reject
		// so loadTexture can fall back instead of the loader hanging forever.
		video.addEventListener("error", () =>
			settle(reject, new Error(`video load failed: ${url}`)),
		);
		// Belt-and-suspenders: some stalls fire neither event. Give up eventually.
		const timer = setTimeout(
			() => settle(reject, new Error(`video load timeout: ${url}`)),
			VIDEO_LOAD_TIMEOUT_MS,
		);
		video.load();
	});
}

// Pick the loader by file extension; everything downstream is identical.
const VIDEO_RE = /\.(mp4|webm|ogv|mov)(\?.*)?$/i;
export function loadTexture(url) {
	const load = VIDEO_RE.test(url) ? loadVideoTexture : loadImageTexture;
	// Never reject: a failed/unsupported source resolves to the bundled fallback
	// image (and a transparent placeholder if even that fails), so callers that
	// await this — and the loading screen behind them — always make progress.
	return load(url)
		.catch(() => loadImageTexture(fallbackImage))
		.catch(() => placeholderTexture());
}

// Point the A / B / C texture slots at prev / centre / next of the carousel.
export function applyCarousel(material, textures, center) {
	const n = textures.length;
	const prev = (center - 1 + n) % n;
	const next = (center + 1) % n;
	const u = material.uniforms;
	const set = (texUniform, sizeUniform, texture) => {
		u[texUniform].value = texture;
		u[sizeUniform].value.set(...textureSize(texture));
	};
	// Stash the current peek sources so the shader can crossfade out of them.
	if (u.uTextureAPrev) {
		u.uTextureAPrev.value = u.uTextureA.value;
		u.uSizeAPrev.value.copy(u.uSizeA.value);
		u.uTextureCPrev.value = u.uTextureC.value;
		u.uSizeCPrev.value.copy(u.uSizeC.value);
	}
	set("uTextureA", "uSizeA", textures[prev]);
	set("uTextureB", "uSizeB", textures[center]);
	set("uTextureC", "uSizeC", textures[next]);
}
