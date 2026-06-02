import { redirect } from "@sveltejs/kit";

// No landing/index page — drop straight into the carousel on the first artist.
export async function load({ parent }) {
	const { artists } = await parent();
	if (artists.length) {
		redirect(307, `/${artists[0].slug}`);
	}
}
