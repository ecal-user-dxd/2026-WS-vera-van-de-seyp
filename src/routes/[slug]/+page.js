import { error } from "@sveltejs/kit";

export async function load({ params, parent }) {
	const { artists } = await parent();
	const index = artists.findIndex((a) => a.slug === params.slug);
	if (index === -1) {
		throw error(404, `No artist found for "${params.slug}"`);
	}
	// `artists` comes from the layout; we just resolve which one is centred.
	return { index };
}
