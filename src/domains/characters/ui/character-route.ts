export type CharacterRoute =
	| { screen: "create" }
	| { screen: "detail"; id: string }
	| { screen: "list" };

export const characterListRoute: CharacterRoute = { screen: "list" };
export const createCharacterRoute: CharacterRoute = { screen: "create" };

export function parseCharacterRoute(pathname: string): CharacterRoute {
	if (pathname === "/" || pathname === "/characters") return characterListRoute;
	if (pathname === "/characters/new") return createCharacterRoute;

	const detailMatch = pathname.match(/^\/characters\/([^/]+)$/);
	if (detailMatch?.[1]) {
		try {
			return { screen: "detail", id: decodeURIComponent(detailMatch[1]) };
		} catch {
			return characterListRoute;
		}
	}

	return characterListRoute;
}

export function characterRoutePath(route: CharacterRoute) {
	if (route.screen === "create") return "/characters/new";
	if (route.screen === "detail") return `/characters/${encodeURIComponent(route.id)}`;
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
