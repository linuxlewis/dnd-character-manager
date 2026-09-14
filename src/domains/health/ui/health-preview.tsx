import { Box, Group, Paper, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import type { CharacterHealth } from "../types/index.js";
import classes from "./health-workspace.module.css";

export function HealthPreview({
	health,
	preview,
	color,
}: {
	health: CharacterHealth;
	preview: number | null;
	color: "green" | "red";
}) {
	const delta = preview === null ? 0 : preview - health.currentHp;
	return (
		<Paper withBorder p="md" role="status" aria-live="polite" aria-atomic="true">
			<Stack gap="sm">
				<Group justify="space-between">
					<Text size="sm" fw={600}>
						HP preview
					</Text>
					{preview !== null && (
						<Text size="sm" fw={700} c={`${color}.3`}>
							{delta > 0 ? "+" : ""}
							{delta} HP
						</Text>
					)}
				</Group>
				<SimpleGrid cols={2} spacing="lg">
					{[
						{ label: "Now", value: health.currentHp, tone: "gray" },
						{ label: "After", value: preview, tone: color },
					].map(({ label, value, tone }) => (
						<Box key={label}>
							<Text size="sm" c="dimmed">
								{label}
							</Text>
							<Text
								className={classes.previewAmount}
								size="1.75rem"
								fw={700}
								c={label === "After" ? `${color}.3` : undefined}
							>
								{value ?? "--"}
								<Text component="span" size="sm" c="dimmed">
									{" "}
									/ {health.effectiveMaxHp}
								</Text>
							</Text>
							<Progress
								aria-hidden="true"
								value={health.effectiveMaxHp > 0 ? ((value ?? 0) / health.effectiveMaxHp) * 100 : 0}
								color={tone}
								size="sm"
								mt="xs"
							/>
						</Box>
					))}
				</SimpleGrid>
				{health.temporaryHp > 0 && (
					<Text size="sm" c="dimmed">
						Maximum includes {health.temporaryHp} temp HP.
					</Text>
				)}
				{preview === null ? (
					<Text size="sm" c="dimmed">
						Enter an amount to preview HP.
					</Text>
				) : preview === health.effectiveMaxHp ? (
					<Text size="sm">Maximum HP reached.</Text>
				) : preview === 0 ? (
					<Text size="sm" c="red.3">
						No HP remaining.
					</Text>
				) : null}
			</Stack>
		</Paper>
	);
}
