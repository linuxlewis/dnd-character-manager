import { Accordion, Group, Stack, Text } from "@mantine/core";
import type { CharacterAttributesResponse } from "../../../generated/api-client.generated.js";
import { formatSignedModifier } from "../types/index.js";

const categoryLabels = {
	"ability-check": "Ability checks",
	skill: "Skills",
	"saving-throw": "Saving throws",
	initiative: "Initiative",
	passive: "Passive values",
} as const;

const categoryOrder = ["ability-check", "skill", "saving-throw", "initiative", "passive"] as const;

export function RollGroups({
	expanded,
	onExpandedChange,
	rolls,
}: {
	expanded: string[];
	onExpandedChange: (values: string[]) => void;
	rolls: CharacterAttributesResponse["attributes"]["rollReference"];
}) {
	return (
		<Stack gap="md">
			{categoryOrder.map((category) => {
				const categoryRolls = rolls.filter((roll) => roll.category === category);
				if (categoryRolls.length === 0) return null;
				return (
					<Stack gap="xs" key={category}>
						<Text c="dimmed" fw={700} size="sm" tt="uppercase">
							{categoryLabels[category]}
						</Text>
						<Accordion multiple value={expanded} onChange={onExpandedChange} variant="default">
							{categoryRolls.map((roll) => (
								<Accordion.Item key={roll.id} value={roll.id}>
									<Accordion.Control>
										<Group justify="space-between" wrap="nowrap">
											<Text>{roll.label}</Text>
											<Text className="numeric" fw={700}>
												{roll.category === "passive"
													? roll.total
													: formatSignedModifier(roll.total)}
											</Text>
										</Group>
									</Accordion.Control>
									<Accordion.Panel>
										<Stack gap="xs" pl="md">
											{roll.components.map((component) => (
												<Group justify="space-between" key={`${roll.id}-${component.type}`}>
													<Text c="dimmed" size="sm">
														{component.label}
													</Text>
													<Text className="numeric" size="sm">
														{component.type === "base"
															? component.value
															: formatSignedModifier(component.value)}
													</Text>
												</Group>
											))}
										</Stack>
									</Accordion.Panel>
								</Accordion.Item>
							))}
						</Accordion>
					</Stack>
				);
			})}
		</Stack>
	);
}
