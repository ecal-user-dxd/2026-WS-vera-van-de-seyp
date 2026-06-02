import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [sveltekit()],
	// .webm / textures are imported as URLs from src/lib/assets.
	assetsInclude: ["**/*.webm"],
});
