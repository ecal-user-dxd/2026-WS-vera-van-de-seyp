import { writable } from "svelte/store";

// True until the carousel has loaded the textures needed for the first paint
// (the centred artist plus its left/right neighbours). The layout shows a
// loader overlay while this is true; the carousel flips it to false via the
// app_two `onReady` callback. Starts true so the loader shows on first mount.
export const loading = writable(true);
