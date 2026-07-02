import { kql } from "./cms.js";

export function slugFromUrl(url) {
	return String(url).replace(/\/+$/, "").split("/").pop();
}

function buildHostedWebsite({ routePrefix, routeName, fallbackUrl, slug }) {
	const prefix = String(routePrefix ?? "")
		.trim()
		.replace(/^\/+|\/+$/g, "");
	const name = String(routeName ?? "")
		.trim()
		.replace(/^\/+|\/+$/g, "");
	const fallback = String(fallbackUrl ?? "").trim();

	if (prefix) {
		const finalName = name || slug || "";
		const publishedPath = finalName
			? `/published/${prefix}/${finalName}`
			: `/published/${prefix}`;
		if (typeof window !== "undefined" && window.location?.origin) {
			return `https://admin.ecal-dxd.ch${publishedPath}`;
		}
		return publishedPath;
	}

	return fallback || undefined;
}

const ARTIST_FIELDS = {
	title: true,
	url: true, // the Kirby page URL — used by slugFromUrl below
	// The hosted website path is derived from the new CMS routing fields. We keep
	// the legacy `url` value as a fallback for older entries.
	website: "page.content.get('url').value",
	route_prefix: "page.content.get('route_prefix').value",
	route_name: "page.content.get('route_name').value",
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

	return (list ?? []).map((artist) => {
		const slug = slugFromUrl(artist.url);
		return {
			...artist,
			inofo: infos,
			slug,
			website: buildHostedWebsite({
				routePrefix: artist.route_prefix,
				routeName: artist.route_name,
				fallbackUrl: artist.website,
				slug,
			}),
		};
	});
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
