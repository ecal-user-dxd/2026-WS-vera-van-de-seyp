import { getArtists } from "$lib/apiManager.js";

export const ssr = false;
export const prerender = false;

export async function load() {
	const artists = await getArtists();
	return { artists };
}
