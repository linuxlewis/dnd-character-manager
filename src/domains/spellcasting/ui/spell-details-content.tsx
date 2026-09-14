import { Divider, Group, Stack, Text, Title } from "@mantine/core";
import type { DndSpellDetails } from "../types/index.js";
import { formatSpellLevel } from "./spell-slot-format.js";

export function SpellDetailsContent({
	details,
}: {
	details: Pick<DndSpellDetails, "source" | "level" | "metadata" | "desc" | "higherLevel">;
}) {
	return (
		<Stack gap="md">
			<Text c="dimmed" size="sm">
				{details.source === "feature" ? "Feature" : "Spell"} {formatSpellLevel(details.level)}
			</Text>

			{details.metadata.length > 0 && (
				<Stack gap="xs">
					{details.metadata.map((item) => (
						<Group key={item.label} justify="space-between" gap="xs" wrap="nowrap">
							<Text c="dimmed" size="sm">
								{item.label}
							</Text>
							<Text size="sm" ta="right">
								{item.value}
							</Text>
						</Group>
					))}
				</Stack>
			)}

			<Divider />

			<Stack gap="sm">
				{details.desc.map((paragraph) => (
					<Text key={paragraph} size="sm">
						{paragraph}
					</Text>
				))}
			</Stack>

			{details.higherLevel.length > 0 && (
				<Stack gap="xs">
					<Title order={4} size="sm">
						At Higher Levels
					</Title>
					{details.higherLevel.map((paragraph) => (
						<Text key={paragraph} size="sm">
							{paragraph}
						</Text>
					))}
				</Stack>
			)}
		</Stack>
	);
}
