import { kql } from "./cms.js";

// The CMS stores every artist as a child page of `workshop-vera`. Each page's
// `url` looks like ".../workshop-vera/martial-grin"; the last segment is the
// slug we route on.
export function slugFromUrl(url) {
	return String(url).replace(/\/+$/, "").split("/").pop();
}

const ARTIST_FIELDS = {
	title: true,
	url: true,
	name: true,
	surname: true,
	// `files` / `files_vertical` are Kirby files fields, each storing a
	// `file://uuid` reference (the panel labels "Files" / "Files-vertical" are
	// stored with an underscore). Resolve each to the file's URL, or null when
	// unset. Returned as plain URL strings under `file` / `vertical_file`.
	file: "page.content.get('files').toFile?.url",
	vertical_file: "page.content.get('files_vertical').toFile?.url",
};

/** All listed artists, each augmented with a `slug` derived from its url. */
export async function getArtists() {
	const list = await kql({
		query: "page('workshop-vera').children.listed",
		select: ARTIST_FIELDS,
	});
	return (list ?? []).map((artist) => ({
		...artist,
		slug: slugFromUrl(artist.url),
	}));
}
