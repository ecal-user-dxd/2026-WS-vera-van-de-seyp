import { redirect } from "@sveltejs/kit";

export async function load({ parent }) {
	const { artists } = await parent();
	if (artists.length) {
		redirect(307, `/${artists[0].slug}`);
	}
}
