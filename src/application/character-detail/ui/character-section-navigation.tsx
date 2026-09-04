import { Anchor, Box } from "@mantine/core";
import { Backpack, BookOpen, Dices } from "lucide-react";
import type { NavigateToCharacterRoute } from "../../../domains/characters/ui/index.js";
import {
	type CharacterSection,
	characterRoutePath,
	shouldHandleCharacterLink,
} from "../../../domains/characters/ui/index.js";

const sections = [
	{
		id: "attributes",
		label: "Attributes & Rolls",
		compactLabel: "Rolls",
		accessibleLabel: "Attributes & Rolls",
		Icon: Dices,
	},
	{
		id: "spells",
		label: "Spells & Abilities",
		compactLabel: "Spells",
		accessibleLabel: "Spells & Abilities",
		Icon: BookOpen,
	},
	{
		id: "inventory",
		label: "Inventory",
		compactLabel: "Inventory",
		accessibleLabel: "Inventory",
		Icon: Backpack,
	},
] as const;

export function CharacterSectionNavigation({
	characterId,
	section,
	onNavigate,
}: {
	characterId: string;
	section: CharacterSection;
	onNavigate: NavigateToCharacterRoute;
}) {
	return (
		<Box component="nav" className="character-section-navigation" aria-label="Character sections">
			{sections.map(({ id, label, compactLabel, accessibleLabel, Icon }) => {
				const route = { screen: "detail", id: characterId, section: id } as const;
				return (
					<Anchor
						key={id}
						href={characterRoutePath(route)}
						aria-label={accessibleLabel}
						aria-current={section === id ? "page" : undefined}
						className="character-section-link"
						underline="never"
						onClick={(event) => {
							if (!shouldHandleCharacterLink(event)) return;
							event.preventDefault();
							onNavigate(route);
						}}
					>
						<Icon size={20} aria-hidden="true" />
						<span className="character-section-full-label">{label}</span>
						<span className="character-section-compact-label">{compactLabel}</span>
					</Anchor>
				);
			})}
		</Box>
	);
}
