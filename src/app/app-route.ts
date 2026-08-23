export type AppRoute = { screen: "characters" } | { screen: "privacy" };

export function parseAppRoute(pathname: string): AppRoute {
	if (pathname === "/privacy" || pathname === "/privacy/") return { screen: "privacy" };
	return { screen: "characters" };
}
