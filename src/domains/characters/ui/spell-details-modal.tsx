import { Alert, Divider, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { CharacterSpellDetails } from "../types/index.js";
import { formatSpellLevel } from "./spell-slot-format.js";

export function SpellDetailsModal({
	details,
	onClose,
	opened,
	pending,
	error,
	withinPortal = true,
}: {
	details: CharacterSpellDetails | null;
	onClose: () => void;
	opened: boolean;
	pending: boolean;
	error?: Error | null;
	withinPortal?: boolean;
}) {
	const mobile = useMediaQuery("(max-width: 47.999em)");
	return (
		<Modal
			classNames={{ body: "workspace-inputs" }}
			closeButtonProps={{ size: "xl", "aria-label": "Close spell dialog" }}
			fullScreen={mobile}
			size="lg"
			onClose={onClose}
			opened={opened}
			title={details?.name ?? "Spell details"}
			transitionProps={{ duration: 0 }}
			withinPortal={withinPortal}
		>
			{error ? (
				<Alert color="red" title="Spell details unavailable">
					Close this sheet and open the spell again to retry.
				</Alert>
			) : pending ? (
				<Text c="dimmed" size="sm">
					Loading details...
				</Text>
			) : details ? (
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
			) : (
				<Text c="dimmed" size="sm">
					Select a spell to view details.
				</Text>
			)}
		</Modal>
	);
}
