import { Group, Progress, Stack, Text, Title } from "@mantine/core";
import type { CharacterDetailResponse } from "../../../generated/api-client.generated.js";
import type { CharacterExperienceProgress } from "../types/index.js";

type CharacterDetailData = CharacterDetailResponse["character"];

export function experienceLabel(experience: CharacterExperienceProgress) {
	if (experience.isMaxLevel) return "Max level";
	if (experience.experienceRemaining === 0) return `Level ${experience.nextLevel} available`;
	return `${experience.progressPercent}% to Lv ${experience.nextLevel}`;
}

export function CharacterExperiencePanel({
	character,
	compact = false,
}: {
	character: CharacterDetailData;
	compact?: boolean;
}) {
	const experience = character.experience;
	const label = experienceLabel(experience);
	const progressAria = {
		role: "progressbar" as const,
		"aria-label": "Experience progress",
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		"aria-valuenow": experience.progressPercent,
		"aria-valuetext": `${formatExperience(character.experiencePoints)} XP. ${label}`,
	};
	if (compact)
		return (
			<Group
				gap={8}
				wrap="nowrap"
				aria-label={`${formatExperience(character.experiencePoints)} XP. ${label}`}
			>
				<Progress.Root {...progressAria} radius="sm" size={4} flex={1}>
					<Progress.Section withAria={false} value={experience.progressPercent} color="candle.4" />
				</Progress.Root>
				<Text size="xs" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
					{label}
				</Text>
			</Group>
		);
	return (
		<Stack gap="xs">
			<Group justify="space-between">
				<Title order={3} size="h5">
					Experience
				</Title>
				<Text>{`${formatExperience(character.experiencePoints)} XP`}</Text>
			</Group>
			<Progress.Root {...progressAria} size={4}>
				<Progress.Section withAria={false} value={experience.progressPercent} color="candle.4" />
			</Progress.Root>
			<Text>{label}</Text>
			{!experience.isMaxLevel && (
				<>
					<Text size="sm">
						Next threshold: {formatExperience(experience.nextLevelMinimum ?? 0)} XP
					</Text>
					<Text size="sm">
						{formatExperience(experience.experienceRemaining ?? 0)} XP to level{" "}
						{experience.nextLevel}
					</Text>
				</>
			)}
		</Stack>
	);
}

function formatExperience(value: number) {
	return new Intl.NumberFormat("en-US").format(value);
}
