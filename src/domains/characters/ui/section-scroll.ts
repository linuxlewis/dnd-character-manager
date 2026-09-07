/** Restore after async section data grows, without keeping inactive queries mounted. */
export function restoreSectionScroll(node: HTMLElement, savedY: number, save: (y: number) => void) {
	let restoring = true;
	function restore() {
		if (!restoring) return;
		window.scrollTo({ top: savedY, behavior: "instant" });
		if (Math.abs(window.scrollY - savedY) < 2) restoring = false;
	}
	function record() {
		if (!restoring) save(window.scrollY);
	}
	function release() {
		restoring = false;
		save(window.scrollY);
	}
	const observer = new ResizeObserver(restore);
	observer.observe(node);
	restore();
	window.addEventListener("scroll", record, { passive: true });
	window.addEventListener("wheel", release, { passive: true });
	window.addEventListener("touchstart", release, { passive: true });
	window.addEventListener("keydown", release);
	window.addEventListener("pointerdown", release, { passive: true });
	return () => {
		observer.disconnect();
		window.removeEventListener("scroll", record);
		window.removeEventListener("wheel", release);
		window.removeEventListener("touchstart", release);
		window.removeEventListener("keydown", release);
		window.removeEventListener("pointerdown", release);
	};
}
