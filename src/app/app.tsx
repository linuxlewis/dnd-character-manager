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
import { Toaster } from "./components/ui/toaster.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
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
			<TooltipProvider delayDuration={300}>
				<div className="min-h-screen bg-background text-foreground font-sans transition-colors overflow-x-hidden">
					<header className="sticky top-0 z-50 flex items-center justify-between px-6 py-2 bg-muted/95 backdrop-blur-sm border-b border-border transition-colors max-sm:px-3 max-sm:py-1.5">
						<h1 className="text-lg font-bold text-primary font-heading max-sm:text-base">
							D&D Character Manager
						</h1>
						<ThemeToggle />
					</header>
					<main className="max-w-[960px] mx-auto p-4 max-sm:p-2">
						<Router routes={routes} />
					</main>
				</div>
				<Toaster />
			</TooltipProvider>
		</ThemeProvider>
	);
}
