import { getInfos } from "$lib/apiManager.js";

export async function load() {
	const infos = await getInfos();
	return { infos };
}
