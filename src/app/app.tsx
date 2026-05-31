/**
 * Root application component.
 *
 * Domain UI components are imported here and composed into the app layout.
 * This file should stay thin — routing, layout shell, and provider wiring only.
 */

import { ItemList } from "../domains/example/ui/item-list.tsx";

export function App() {
	return (
		<div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
			<h1>D&D Character Manager</h1>
			<p style={{ color: "#666" }}>
				A D&D 5e character management app seeded for agent-first development.
			</p>
			<hr />
			<ItemList />
		</div>
	);
}
