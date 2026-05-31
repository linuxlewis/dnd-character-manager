/**
 * Root application component.
 *
 * Domain UI components are imported here and composed into the app layout.
 * This file should stay thin — routing, layout shell, and provider wiring only.
 */

import { Badge, Container, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { ItemList } from "../domains/example/ui/item-list.tsx";

export function App() {
	return (
		<Container size="md" py={{ base: "xl", sm: "calc(var(--mantine-spacing-xl) * 2)" }}>
			<Stack gap="xl">
				<Stack gap="xs">
					<Group gap="sm" align="center">
						<Title order={1} size="h2">
							D&D Character Manager
						</Title>
						<Badge color="candle" variant="light">
							D&D 5e
						</Badge>
					</Group>
					<Text c="dimmed" maw={640}>
						A D&D 5e character management app seeded for agent-first development.
					</Text>
				</Stack>
				<Divider />
				<ItemList />
			</Stack>
		</Container>
	);
}
