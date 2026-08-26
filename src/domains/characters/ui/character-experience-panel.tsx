import { Group, Progress, Stack, Text, Title } from "@mantine/core";
import type { CharacterDetailResponse } from "../../../generated/api-client.generated.js";

type CharacterDetailData = CharacterDetailResponse["character"];

export function CharacterExperiencePanel({ character }: { character: CharacterDetailData }) {
	const experience = character.experience;
	const totalExperienceLabel = `${formatExperience(character.experiencePoints)} XP`;
	const progressLabel = experience.isMaxLevel
		? "Maximum level reached"
		: `${formatExperience(experience.experienceRemaining ?? 0)} XP to level ${experience.nextLevel}`;

	return (
		<Stack gap="xs">
			<Group justify="space-between" align="flex-end" wrap="wrap">
				<Title order={3} size="h5">
					Experience
				</Title>
				<Text c="dimmed" size="sm">
					{totalExperienceLabel}
				</Text>
			</Group>
			<Progress
				aria-label="Experience progress"
				radius="sm"
				size="lg"
				value={experience.progressPercent}
			/>
			<Group justify="space-between" gap="xs" wrap="wrap">
				<Text c="dimmed" size="sm">
					{progressLabel}
				</Text>
				<Text c="dimmed" size="sm">
					{experience.progressPercent}%
				</Text>
			</Group>
		</Stack>
	);
}

function formatExperience(value: number) {
	return new Intl.NumberFormat("en-US").format(value);
}
