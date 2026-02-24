/**
 * Root application component.
 *
 * Domain UI components are imported here and composed into the app layout.
 * This file should stay thin — routing, layout shell, and provider wiring only.
 */

import { CharacterForm } from "../domains/character/ui/CharacterForm.tsx";
import { CharacterList } from "../domains/character/ui/CharacterList.tsx";
import { CharacterSheet } from "../domains/character/ui/CharacterSheet.tsx";
import { ThemeProvider } from "./ThemeProvider.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import styles from "./layout.module.css";
import { Router, createRoute } from "./router.tsx";

const routes = [
	createRoute("/", () => <CharacterList />),
	createRoute("/character/new", () => <CharacterForm />),
	createRoute("/character/:id/edit", (params) => <CharacterForm id={params.id} />),
	createRoute("/character/:id", (params) => <CharacterSheet id={params.id} />),
	createRoute("/characters/:slug", (params) => <CharacterSheet slug={params.slug} />),
];

export function App() {
	return (
		<ThemeProvider>
			<div className={styles.appShell}>
				<header className={styles.header}>
					<h1 className={styles.title}>D&D Character Manager</h1>
					<ThemeToggle />
				</header>
				<main className={styles.main}>
					<Router routes={routes} />
				</main>
			</div>
		</ThemeProvider>
	);
}
