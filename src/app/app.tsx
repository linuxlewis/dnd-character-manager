/**
 * Root application component.
 *
 * Domain UI components are imported here and composed into the app layout.
 * This file should stay thin — routing, layout shell, and provider wiring only.
 */

import { CharacterForm } from "../domains/character/ui/CharacterForm.tsx";
import { CharacterList } from "../domains/character/ui/CharacterList.tsx";
import { CharacterSheet } from "../domains/character/ui/CharacterSheet.tsx";
import { Router, createRoute } from "./router.tsx";

const routes = [
	createRoute("/", () => <CharacterList />),
	createRoute("/character/new", () => <CharacterForm />),
	createRoute("/character/:id/edit", (params) => <CharacterForm id={params.id} />),
	createRoute("/character/:id", (params) => <CharacterSheet id={params.id} />),
];

export function App() {
	return <Router routes={routes} />;
}
