import { CharacterDetail } from "./character-detail.js";
import { CharacterList } from "./character-list.js";
import type { CharacterRoute } from "./character-route.js";
import { characterRoutePath, parseCharacterRoute } from "./character-route.js";
import { CreateCharacterForm } from "./create-character-form.js";

export type NavigateToCharacterRoute = (route: CharacterRoute) => void;

export function CharacterWorkspace() {
	const route = getCurrentCharacterRoute();

	function navigate(route: CharacterRoute) {
		if (typeof window === "undefined") return;
		window.location.assign(characterRoutePath(route));
	}

	if (route.screen === "create") return <CreateCharacterForm onNavigate={navigate} />;
	if (route.screen === "detail") {
		return <CharacterDetail id={route.id} onNavigate={navigate} />;
	}
	return <CharacterList onNavigate={navigate} />;
}

function getCurrentCharacterRoute() {
	if (typeof window === "undefined") return parseCharacterRoute("/");
	return parseCharacterRoute(window.location.pathname);
}
