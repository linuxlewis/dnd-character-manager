/**
 * Simple client-side router using browser History API.
 * No external dependencies — uses popstate + pushState.
 */

import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";

interface Route {
	pattern: RegExp;
	component: (params: Record<string, string>) => ReactNode;
}

interface RouterContextValue {
	navigate: (path: string) => void;
	path: string;
}

const RouterContext = createContext<RouterContextValue>({
	navigate: () => {},
	path: "/",
});

export function useNavigate() {
	return useContext(RouterContext).navigate;
}

export function useCurrentPath() {
	return useContext(RouterContext).path;
}

let listeners: Array<() => void> = [];
function subscribe(cb: () => void) {
	listeners.push(cb);
	return () => {
		listeners = listeners.filter((l) => l !== cb);
	};
}
function getSnapshot() {
	return window.location.pathname;
}

export function Router({ routes }: { routes: Route[] }) {
	const path = useSyncExternalStore(subscribe, getSnapshot);

	useEffect(() => {
		const onPop = () => {
			for (const l of listeners) l();
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);

	const navigate = useCallback((to: string) => {
		window.history.pushState(null, "", to);
		for (const l of listeners) l();
	}, []);

	let content: ReactNode = <div>Not Found</div>;
	for (const route of routes) {
		const match = path.match(route.pattern);
		if (match) {
			const params: Record<string, string> = {};
			const groups = match.groups;
			if (groups) {
				for (const [k, v] of Object.entries(groups)) {
					params[k] = v;
				}
			}
			content = route.component(params);
			break;
		}
	}

	return <RouterContext.Provider value={{ navigate, path }}>{content}</RouterContext.Provider>;
}

export function createRoute(
	pattern: string,
	component: (params: Record<string, string>) => ReactNode,
): Route {
	// Convert "/character/:id" to regex with named groups
	const regexStr = `^${pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)")}$`;
	return { pattern: new RegExp(regexStr), component };
}
