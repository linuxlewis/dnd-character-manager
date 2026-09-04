import { Anchor, Box, Group } from "@mantine/core";
import type { CharacterSection } from "./character-route.js";
import { characterSectionPath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";

const sections: readonly { key: CharacterSection; label: string; compactLabel: string }[] = [
	{ key: "attributes", label: "Attributes & Rolls", compactLabel: "Rolls" },
	{ key: "spells", label: "Spells & Abilities", compactLabel: "Spells" },
	{ key: "inventory", label: "Inventory", compactLabel: "Inventory" },
];

export function CharacterSectionNavigation({
	activeSection,
	characterId,
	onNavigate,
}: {
	activeSection: CharacterSection;
	characterId: string;
	onNavigate: NavigateToCharacterRoute;
}) {
	return (
		<Box
			component="nav"
			aria-label="Character sections"
			className="character-section-navigation"
			py="xs"
		>
			<Group gap={0} wrap="nowrap">
				{sections.map((section) => {
					const active = section.key === activeSection;
					return (
						<Anchor
							aria-current={active ? "page" : undefined}
							aria-label={section.label}
							className={active ? "character-section-link active" : "character-section-link"}
							data-active={active || undefined}
							href={characterSectionPath(characterId, section.key)}
							key={section.key}
							onClick={(event) => {
								if (!shouldHandleCharacterLink(event)) return;
								event.preventDefault();
								onNavigate({ screen: "detail", id: characterId, section: section.key });
							}}
							underline="never"
						>
							<span className="character-section-full-label">{section.label}</span>
							<span aria-hidden="true" className="character-section-compact-label">
								{section.compactLabel}
							</span>
						</Anchor>
					);
				})}
			</Group>
		</Box>
	);
}
