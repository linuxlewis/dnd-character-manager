import { Accordion, Group, Stack, Text } from "@mantine/core";
import type { CharacterAttributesResponse } from "../../../generated/api-client.generated.js";
import { CHARACTER_ABILITIES } from "../config/index.js";
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
						<Text className="attributes-metadata" fw={700} size="sm" tt="uppercase">
							{categoryLabels[category]}
						</Text>
						<Accordion multiple value={expanded} onChange={onExpandedChange} variant="default">
							{categoryRolls.map((roll) => (
								<Accordion.Item key={roll.id} value={roll.id}>
									<Accordion.Control
										aria-label={`${roll.label}, ${getAbilityLabel(roll.ability)}${
											roll.proficiencyRank === null ? "" : `, ${getRankLabel(roll.proficiencyRank)}`
										}, total ${formatRollTotal(roll)}`}
									>
										<Group className="roll-reference-control" justify="space-between" wrap="nowrap">
											<Stack gap={2} style={{ minWidth: 0 }}>
												<Text>{roll.label}</Text>
												<Text className="attributes-metadata" size="xs">
													{getAbilityLabel(roll.ability)}
													{roll.proficiencyRank === null
														? ""
														: ` · ${getRankLabel(roll.proficiencyRank)}`}
												</Text>
											</Stack>
											<Text className="numeric" fw={700}>
												{formatRollTotal(roll)}
											</Text>
										</Group>
									</Accordion.Control>
									<Accordion.Panel>
										<Stack className="roll-breakdown" gap="xs" pl="md">
											<Text className="attributes-metadata" size="xs">
												Source: {getAbilityLabel(roll.ability)}
											</Text>
											{roll.components.map((component) => (
												<Group justify="space-between" key={`${roll.id}-${component.type}`}>
													<Text className="attributes-metadata" size="sm">
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

function getAbilityLabel(
	ability: CharacterAttributesResponse["attributes"]["rollReference"][number]["ability"],
) {
	return CHARACTER_ABILITIES.find((entry) => entry.key === ability)?.label ?? ability;
}

function getRankLabel(
	rank: NonNullable<
		CharacterAttributesResponse["attributes"]["rollReference"][number]["proficiencyRank"]
	>,
) {
	return rank === "none" ? "No proficiency" : rank[0].toUpperCase() + rank.slice(1);
}

function formatRollTotal(roll: CharacterAttributesResponse["attributes"]["rollReference"][number]) {
	return roll.category === "passive" ? roll.total : formatSignedModifier(roll.total);
}
