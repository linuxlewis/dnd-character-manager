export type CharacterSection = "spells" | "inventory";

export type CharacterRoute =
	| { screen: "create" }
	| { screen: "detail"; id: string; section?: CharacterSection }
	| { screen: "list" };

export const characterListRoute: CharacterRoute = { screen: "list" };
export const createCharacterRoute: CharacterRoute = { screen: "create" };

export function parseCharacterRoute(pathname: string): CharacterRoute {
	if (pathname === "/" || pathname === "/characters") return characterListRoute;
	if (pathname === "/characters/new") return createCharacterRoute;

	const detailMatch = pathname.match(/^\/characters\/([^/]+)(?:\/(spells|inventory))?$/);
	if (detailMatch?.[1]) {
		try {
			const route: CharacterRoute = { screen: "detail", id: decodeURIComponent(detailMatch[1]) };
			if (detailMatch[2]) route.section = detailMatch[2] as CharacterSection;
			return route;
		} catch {
			return characterListRoute;
		}
	}

	return characterListRoute;
}

export function characterRoutePath(route: CharacterRoute) {
	if (route.screen === "create") return "/characters/new";
	if (route.screen === "detail") {
		return `/characters/${encodeURIComponent(route.id)}${route.section ? `/${route.section}` : ""}`;
	}
	return "/characters";
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
