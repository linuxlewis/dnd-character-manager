/**
 * Root application component.
 *
 * Domain UI components are imported here and composed into the app layout.
 * This file should stay thin — routing, layout shell, and provider wiring only.
 */

import { Swords } from "lucide-react";
import { CharacterForm } from "../domains/character/ui/CharacterForm.tsx";
import { CharacterList } from "../domains/character/ui/CharacterList.tsx";
import { CharacterSheet } from "../domains/character/ui/CharacterSheet.tsx";
import { DiceRoller } from "../domains/character/ui/DiceRoller.tsx";
import { DiceRollerProvider } from "../domains/character/ui/DiceRollerContext.tsx";
import { ThemeProvider } from "./ThemeProvider.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { Router, createRoute, useNavigate } from "./router.tsx";

const routes = [
	createRoute("/", () => <CharacterList />),
	createRoute("/character/new", () => <CharacterForm />),
	createRoute("/character/:id/edit", (params) => <CharacterForm id={params.id} />),
	createRoute("/character/:id", (params) => <CharacterSheet id={params.id} />),
	createRoute("/characters/:slug", (params) => <CharacterSheet slug={params.slug} />),
];

function AppHeader() {
	const navigate = useNavigate();
	return (
		<header className="sticky top-0 z-50 flex items-center justify-between px-6 py-2 bg-muted/95 backdrop-blur-sm border-b border-border transition-colors max-sm:px-3 max-sm:py-1.5">
			<button
				type="button"
				className="flex items-center gap-2 text-lg font-bold text-primary font-heading max-sm:text-base cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
				onClick={() => navigate("/")}
				aria-label="Go to home page"
			>
				<Swords className="h-5 w-5" />
				<span>D&D Character Manager</span>
			</button>
			<div className="flex items-center gap-2">
				<DiceRoller />
				<ThemeToggle />
			</div>
		</header>
	);
}

export function App() {
	return (
		<ThemeProvider>
			<DiceRollerProvider>
				<TooltipProvider delayDuration={300}>
					<div className="min-h-screen bg-background text-foreground font-sans transition-colors overflow-x-hidden">
						<a href="#main-content" className="skip-link">
							Skip to main content
						</a>
						<AppHeader />
						<main id="main-content" className="max-w-[960px] mx-auto p-4 max-sm:p-2">
							<Router routes={routes} />
						</main>
					</div>
					<Toaster />
				</TooltipProvider>
			</DiceRollerProvider>
		</ThemeProvider>
	);
}
