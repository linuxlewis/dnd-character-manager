import { useSyncExternalStore } from "react";

const navigationEvent = "app:navigate";

function subscribe(onChange: () => void) {
	window.addEventListener("popstate", onChange);
	window.addEventListener(navigationEvent, onChange);
	const previousRestoration = window.history.scrollRestoration;
	window.history.scrollRestoration = "manual";
	return () => {
		window.removeEventListener("popstate", onChange);
		window.removeEventListener(navigationEvent, onChange);
		window.history.scrollRestoration = previousRestoration;
	};
}

function getPathname() {
	return window.location.pathname;
}

export function useBrowserPathname() {
	return useSyncExternalStore(subscribe, getPathname, () => "/");
}

export function navigateBrowserPath(pathname: string) {
	if (window.location.pathname === pathname) return;
	window.history.pushState(null, "", pathname);
	window.dispatchEvent(new Event(navigationEvent));
}
