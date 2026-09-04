import { useSyncExternalStore } from "react";

export type CharacterRoute =
	| { screen: "create" }
	| { screen: "detail"; id: string; section?: CharacterSection }
	| { screen: "list" };

export type CharacterSection = "attributes" | "spells" | "inventory";

export const characterListRoute: CharacterRoute = { screen: "list" };
export const createCharacterRoute: CharacterRoute = { screen: "create" };

export function parseCharacterRoute(pathname: string): CharacterRoute {
	if (pathname === "/" || pathname === "/characters") return characterListRoute;
	if (pathname === "/characters/new") return createCharacterRoute;

	const detailMatch = pathname.match(/^\/characters\/([^/]+)(?:\/(.*))?\/?$/);
	if (detailMatch?.[1]) {
		try {
			return {
				screen: "detail",
				id: decodeURIComponent(detailMatch[1]),
				section: parseCharacterSection(detailMatch[2]),
			};
		} catch {
			return characterListRoute;
		}
	}

	return characterListRoute;
}

export function characterRoutePath(route: CharacterRoute) {
	if (route.screen === "create") return "/characters/new";
	if (route.screen === "detail") {
		const basePath = `/characters/${encodeURIComponent(route.id)}`;
		return !route.section || route.section === "attributes"
			? basePath
			: `${basePath}/${route.section}`;
	}
	return "/characters";
}

export function characterSectionPath(id: string, section: CharacterSection) {
	return characterRoutePath({ screen: "detail", id, section });
}

export function useCharacterPathname(initialPathname?: string) {
	return useSyncExternalStore(
		(onStoreChange) => {
			if (initialPathname !== undefined || typeof window === "undefined") return () => undefined;
			window.addEventListener("popstate", onStoreChange);
			return () => window.removeEventListener("popstate", onStoreChange);
		},
		() => (typeof window === "undefined" ? "/" : window.location.pathname),
		() => initialPathname ?? "/",
	);
}

function parseCharacterSection(value: string | undefined): CharacterSection {
	if (value === "spells" || value === "inventory") return value;
	return "attributes";
}

export function shouldHandleCharacterLink(event: {
	altKey: boolean;
	button: number;
	ctrlKey: boolean;
	defaultPrevented: boolean;
	metaKey: boolean;
	shiftKey: boolean;
}) {
	return (
		!event.defaultPrevented &&
		event.button === 0 &&
		!event.metaKey &&
		!event.altKey &&
		!event.ctrlKey &&
		!event.shiftKey
	);
}
