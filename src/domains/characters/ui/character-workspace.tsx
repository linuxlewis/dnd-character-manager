import { Stack } from "@mantine/core";
import { useState } from "react";
import { CharacterDetail } from "./character-detail.js";
import { CharacterList } from "./character-list.js";
import { type CharacterRoute, characterRoutePath, parseCharacterRoute } from "./character-route.js";
import { CreateCharacterForm } from "./create-character-form.js";

export type NavigateToCharacterRoute = (route: CharacterRoute) => void;

export function CharacterWorkspace() {
	const [route, setRoute] = useState(getInitialRoute);

	const navigate: NavigateToCharacterRoute = (nextRoute) => {
		if (typeof window !== "undefined") {
			window.history.pushState({}, "", characterRoutePath(nextRoute));
		}
		setRoute(nextRoute);
	};

	return (
		<Stack gap="lg">
			{route.screen === "list" && <CharacterList onNavigate={navigate} />}
			{route.screen === "create" && <CreateCharacterForm onNavigate={navigate} />}
			{route.screen === "detail" && <CharacterDetail id={route.id} onNavigate={navigate} />}
		</Stack>
	);
}

function getInitialRoute() {
	if (typeof window === "undefined") return { screen: "list" } satisfies CharacterRoute;
	return parseCharacterRoute(window.location.pathname);
}
