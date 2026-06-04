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

	const infos = await kql({
		query: "page('workshop-vera').content",
		select: {
			title: true,
			description: true,
			favicon: true,
			seo_title: true,
			seo_description: true,
		},
	});

	console.log("infos", infos);

	return (list ?? []).map((artist) => ({
		...artist,
		inofo: infos,
		slug: slugFromUrl(artist.url),
	}));
}

// The workshop's own content (title + description). Used by the /informations
// page, which renders the description text into a WebGL texture.
export async function getInfos() {
	const infos = await kql({
		query: "page('workshop-vera').content",
		select: {
			title: true,
			description: true,
			seo_title: true,
			seo_description: true,
		},
	});

	return infos ?? {};
}
