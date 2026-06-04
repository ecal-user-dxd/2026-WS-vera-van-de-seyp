// Wires window input (resize / mouse / touch) to an app_two instance and the
// page's portrait state. Returns a cleanup that removes every listener.
//
// Portrait state lives on the page (it also drives the title wipe), so it is
// read and written through `getPortrait` / `setPortrait` rather than owned here.

const SWIPE_THRESHOLD = 40; // px of travel before a drag counts as a swipe
const TAP_MAX_MOVE = 12; // px of travel still treated as a tap

export function attachControls({
	app,
	canvas,
	getPortrait,
	setPortrait,
	sourcesForViewport,
}) {
	const onResize = (ev) => {
		canvas.style.width = window.innerWidth + "px";
		canvas.style.height = window.innerHeight + "px";
		app.onEventHandler("resize", {
			ev,
			width: window.innerWidth,
			height: window.innerHeight,
		});
		const portrait = window.innerHeight > window.innerWidth;
		if (portrait !== getPortrait()) {
			setPortrait(portrait);
			app.setImages(sourcesForViewport());
			app.setOrientation(portrait);
		}
	};
	const onMouseMove = (ev) => app.onEventHandler("mousemove", { ev });
	// Clicks/taps on overlay UI (the navigation) must not also drive the carousel,
	// so following a nav link doesn't change the artist underneath.
	const onOverlay = (ev) => !!ev.target?.closest?.("nav");
	const onClick = (ev) => {
		if (onOverlay(ev)) return;
		app.onEventHandler("click", { ev });
	};

	// Touch: drag the reveal origin under the finger, then on release decide
	// between a swipe (navigate by direction) and a tap (navigate by half).
	// Portrait swipes top↔bottom; landscape swipes left↔right.
	let touchStartX = 0;
	let touchStartY = 0;
	const onTouchStart = (ev) => {
		const t = ev.touches[0];
		touchStartX = t.clientX;
		touchStartY = t.clientY;
		app.onEventHandler("mousemove", { ev: t });
	};
	const onTouchMove = (ev) => {
		ev.preventDefault(); // stop page scroll / pull-to-refresh
		const t = ev.touches[0];
		app.onEventHandler("mousemove", { ev: t });
		// Slide the object 1:1 with the finger along the active axis (clip space
		// spans 2 units across the screen). Clip y is up, so screen dy is negated.
		const dx = t.clientX - touchStartX;
		const dy = t.clientY - touchStartY;
		app.onEventHandler("drag", {
			x: getPortrait() ? 0 : (dx / window.innerWidth) * 2,
			y: getPortrait() ? -(dy / window.innerHeight) * 2 : 0,
		});
	};
	const onTouchEnd = (ev) => {
		if (onOverlay(ev)) {
			app.onEventHandler("drag", { x: 0, y: 0 });
			return;
		}
		const t = ev.changedTouches[0];
		const dx = t.clientX - touchStartX;
		const dy = t.clientY - touchStartY;
		const origin = {
			x: t.clientX / window.innerWidth,
			y: 1 - t.clientY / window.innerHeight, // y-up, matching the shader
		};
		if (getPortrait()) {
			if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx))
				app.navigate(dy < 0 ? 1 : -1, origin); // swipe up = next
			else if (Math.hypot(dx, dy) < TAP_MAX_MOVE)
				app.navigate(origin.y > 0.5 ? -1 : 1, origin); // tap top = prev
		} else {
			if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy))
				app.navigate(dx < 0 ? 1 : -1, origin); // swipe left = next
			else if (Math.hypot(dx, dy) < TAP_MAX_MOVE)
				app.navigate(origin.x < 0.5 ? -1 : 1, origin); // tap left = prev
		}
		// Release the finger: ease the dragged quad back to centre.
		app.onEventHandler("drag", { x: 0, y: 0 });
	};

	const listeners = [
		{ type: "resize", handler: onResize },
		{ type: "mousemove", handler: onMouseMove },
		{ type: "click", handler: onClick },
		{ type: "touchstart", handler: onTouchStart, options: { passive: true } },
		{ type: "touchmove", handler: onTouchMove, options: { passive: false } },
		{ type: "touchend", handler: onTouchEnd },
	];

	for (const { type, handler, options } of listeners)
		window.addEventListener(type, handler, options);

	return () => {
		for (const { type, handler, options } of listeners)
			window.removeEventListener(type, handler, options);
	};
}
