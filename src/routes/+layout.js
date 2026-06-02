import { getArtists } from "$lib/apiManager.js";

// The CMS client and the three.js carousel both rely on browser APIs
// (fetch against the local Kirby instance, WebGL, window), so we render
// everything on the client — same lifecycle as the original window.onload app.
export const ssr = false;
export const prerender = false;

// The whole site is a single carousel over every artist, so the full list is
// loaded once here and shared by every route via `await parent()`.
export async function load() {
	const artists = await getArtists();
	return { artists };
}
