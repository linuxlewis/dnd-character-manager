import { Stack } from "@mantine/core";
import { useSyncExternalStore } from "react";
import { CharacterDetail } from "./character-detail.js";
import { CharacterList } from "./character-list.js";
import {
	type CharacterRoute,
	characterListRoute,
	characterRoutePath,
	parseCharacterRoute,
} from "./character-route.js";
import { CreateCharacterForm } from "./create-character-form.js";

export type NavigateToCharacterRoute = (route: CharacterRoute) => void;

export function CharacterWorkspace() {
	const route = useSyncExternalStore(
		subscribeToBrowserRoute,
		getBrowserRouteSnapshot,
		getServerRouteSnapshot,
	);

	const navigate: NavigateToCharacterRoute = (nextRoute) => {
		if (typeof window === "undefined") return;

		window.history.pushState({}, "", characterRoutePath(nextRoute));
		notifyBrowserRouteSubscribers();
	};

	return (
		<Stack gap="lg">
			{route.screen === "list" && <CharacterList onNavigate={navigate} />}
			{route.screen === "create" && <CreateCharacterForm onNavigate={navigate} />}
			{route.screen === "detail" && <CharacterDetail id={route.id} onNavigate={navigate} />}
		</Stack>
	);
}

const routeSubscribers = new Set<() => void>();
let cachedBrowserPathname = "";
let cachedBrowserRoute: CharacterRoute = characterListRoute;

function subscribeToBrowserRoute(onStoreChange: () => void) {
	if (typeof window === "undefined") return () => undefined;

	routeSubscribers.add(onStoreChange);
	window.addEventListener("popstate", onStoreChange);

	return () => {
		routeSubscribers.delete(onStoreChange);
		window.removeEventListener("popstate", onStoreChange);
	};
}

function getBrowserRouteSnapshot() {
	if (typeof window === "undefined") return characterListRoute;

	const nextPathname = window.location.pathname;
	if (nextPathname === cachedBrowserPathname) return cachedBrowserRoute;

	cachedBrowserPathname = nextPathname;
	cachedBrowserRoute = parseCharacterRoute(nextPathname);

	return cachedBrowserRoute;
}

function getServerRouteSnapshot() {
	return characterListRoute;
}

function notifyBrowserRouteSubscribers() {
	for (const subscriber of routeSubscribers) {
		subscriber();
	}
}
