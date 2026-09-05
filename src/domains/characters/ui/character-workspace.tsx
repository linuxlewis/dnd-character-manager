import { CharacterDetail } from "./character-detail.js";
import { CharacterList } from "./character-list.js";
import type { CharacterRoute } from "./character-route.js";
import {
	characterRoutePath,
	parseCharacterRoute,
	useCharacterPathname,
} from "./character-route.js";
import { CreateCharacterForm } from "./create-character-form.js";

export type NavigateToCharacterRoute = (route: CharacterRoute) => void;

export function CharacterWorkspace({ pathname }: { pathname?: string } = {}) {
	const currentPathname = useCharacterPathname(pathname);
	const route = parseCharacterRoute(currentPathname);

	function navigate(route: CharacterRoute) {
		if (typeof window === "undefined") return;
		window.history.pushState({}, "", characterRoutePath(route));
		window.dispatchEvent(new Event("popstate"));
	}

	if (route.screen === "create") return <CreateCharacterForm onNavigate={navigate} />;
	if (route.screen === "detail") {
		return (
			<CharacterDetail
				id={route.id}
				onNavigate={navigate}
				section={route.section ?? "attributes"}
			/>
		);
	}
	return <CharacterList onNavigate={navigate} />;
}
