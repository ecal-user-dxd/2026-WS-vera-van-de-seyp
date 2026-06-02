import * as THREE from "three";

// ---- Texture manager -------------------------------------------------------
// Reusable, stateless helpers for loading and measuring textures, plus the
// carousel slot mapping. Everything here depends only on its arguments, so it
// can be shared by any instance — state (material, textures, …) is passed in.

// Intrinsic pixel size of a texture, whether it wraps an image or a video.
export function textureSize(texture) {
	const src = texture.image;
	const w = src.videoWidth || src.naturalWidth || src.width || 1;
	const h = src.videoHeight || src.naturalHeight || src.height || 1;
	return [w, h];
}

export function loadImageTexture(url) {
	return new Promise((resolve) => {
		new THREE.TextureLoader().load(url, (texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.minFilter = THREE.LinearFilter;
			resolve(texture);
		});
	});
}

export function loadVideoTexture(url) {
	return new Promise((resolve) => {
		const video = document.createElement("video");
		video.src = url;
		video.loop = true;
		video.muted = true; // required for autoplay without a user gesture
		video.playsInline = true;
		video.crossOrigin = "anonymous";
		// Wait for dimensions to be known, then start playing.
		video.addEventListener("loadeddata", () => {
			video.play();
			const texture = new THREE.VideoTexture(video); // auto-updates each frame
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.minFilter = THREE.LinearFilter;
			resolve(texture);
		});
		video.load();
	});
}

// Pick the loader by file extension; everything downstream is identical.
const VIDEO_RE = /\.(mp4|webm|ogv|mov)(\?.*)?$/i;
export function loadTexture(url) {
	return VIDEO_RE.test(url) ? loadVideoTexture(url) : loadImageTexture(url);
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
