import { kql } from "./cms.js";

export function slugFromUrl(url) {
	return String(url).replace(/\/+$/, "").split("/").pop();
}

const ARTIST_FIELDS = {
	title: true,
	url: true,
	name: true,
	surname: true,
	file: "page.content.get('files').toFile?.url",
	vertical_file: "page.content.get('files_vertical').toFile?.url",
};

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
