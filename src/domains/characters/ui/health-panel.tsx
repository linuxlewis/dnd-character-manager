import { Alert, Button, Group, Progress, Stack, Text, Title } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { CharacterDetailResponse } from "../../../generated/api-client.generated.js";
import { apiMutations, apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterHealth, HealthChangeResponse } from "../types/index.js";
import { HealthAmountModal, HealthEditModal, type NumberDraft } from "./health-dialogs.js";
import { formatHealthChange, getHealthColor } from "./health-display.js";

type HealthDialog = "damage" | "edit" | "heal" | null;

export function CharacterHealthPanel({
	characterId,
	health,
	recentHealthChanges,
}: {
	characterId: string;
	health: CharacterHealth;
	recentHealthChanges: HealthChangeResponse[];
}) {
	const [activeDialog, setActiveDialog] = useState<HealthDialog>(null);
	const [amountDraft, setAmountDraft] = useState<NumberDraft>("");
	const [historyOpen, setHistoryOpen] = useState(false);
	const [maxDraft, setMaxDraft] = useState<NumberDraft>(health.maxHp);
	const [temporaryDraft, setTemporaryDraft] = useState<NumberDraft>(health.temporaryHp);
	const queryClient = useQueryClient();
	const healthPercent =
		health.effectiveMaxHp > 0 ? Math.round((health.currentHp / health.effectiveMaxHp) * 100) : 0;
	const updateMutation = useMutation({
		...apiMutations.updateCharacterHealth(),
		onSuccess: (response) => {
			closeDialog();
			queryClient.setQueryData(
				apiQueryKeys.getCharacter({ characterId }),
				(current: CharacterDetailResponse | undefined) =>
					current
						? {
								character: {
									...current.character,
									health: response.health,
									recentHealthChanges: response.recentHealthChanges,
								},
							}
						: current,
			);
		},
	});

	function openAmountDialog(dialog: Exclude<HealthDialog, "edit" | null>) {
		setAmountDraft("");
		setActiveDialog(dialog);
	}

	function openEditDialog() {
		setMaxDraft(health.maxHp);
		setTemporaryDraft(health.temporaryHp);
		setActiveDialog("edit");
	}

	function closeDialog() {
		setActiveDialog(null);
		setAmountDraft("");
		setMaxDraft(health.maxHp);
		setTemporaryDraft(health.temporaryHp);
	}

	function saveHealth(patch: Partial<CharacterHealth>) {
		updateMutation.mutate({
			params: { characterId },
			body: {
				currentHp: patch.currentHp ?? health.currentHp,
				maxHp: patch.maxHp ?? health.maxHp,
				temporaryHp: patch.temporaryHp ?? health.temporaryHp,
			},
		});
	}

	function saveAmountChange(direction: "damage" | "heal") {
		const amount = toWholeNumber(amountDraft);
		if (!amount || amount < 1) return;
		const delta = direction === "heal" ? amount : -amount;
		saveHealth({ currentHp: clamp(health.currentHp + delta, 0, health.effectiveMaxHp) });
	}

	function saveEditChange() {
		const maxHp = toWholeNumber(maxDraft);
		const temporaryHp = toWholeNumber(temporaryDraft);
		if (!maxHp || maxHp < 1 || temporaryHp === null || temporaryHp < 0) return;
		saveHealth({ maxHp, temporaryHp });
	}

	return (
		<Stack gap="md">
			<Stack gap="xs">
				<Group justify="space-between">
					<Title order={3} size="h5">
						Health
					</Title>
					<Button
						aria-expanded={historyOpen}
						onClick={() => setHistoryOpen((opened) => !opened)}
						size="xs"
						variant="subtle"
					>
						History ({recentHealthChanges.length})
					</Button>
				</Group>
				<Group align="center" gap="xs" wrap="wrap">
					<Text c="dimmed" size="sm">
						{health.currentHp} / {health.effectiveMaxHp} HP ({formatTemporaryHp(health.temporaryHp)}
						)
					</Text>
					<Button onClick={openEditDialog} size="compact-xs" variant="subtle">
						Edit
					</Button>
				</Group>
				<Group align="center" gap="xs" wrap="wrap">
					<Progress
						aria-label={`Health: ${health.currentHp} of ${health.effectiveMaxHp} HP`}
						color={getHealthColor(health)}
						radius="sm"
						size="lg"
						style={{ flex: "1 1 100%" }}
						value={healthPercent}
					/>
				</Group>
				<Group align="center" gap="xs" grow wrap="nowrap">
					<Button color="green" onClick={() => openAmountDialog("heal")} size="xs">
						Heal
					</Button>
					<Button color="red" onClick={() => openAmountDialog("damage")} size="xs">
						Damage
					</Button>
				</Group>
			</Stack>

			{historyOpen && (
				<Stack gap="xs">
					{recentHealthChanges.length === 0 ? (
						<Text c="dimmed" size="sm">
							No health changes yet.
						</Text>
					) : (
						recentHealthChanges.map((change) => (
							<Group key={change.id} justify="space-between">
								<Text size="sm">{formatHealthChange(change)}</Text>
								<Text c="dimmed" size="xs">
									{new Date(change.createdAt).toLocaleString()}
								</Text>
							</Group>
						))
					)}
				</Stack>
			)}

			<HealthAmountModal
				amountDraft={amountDraft}
				color="green"
				onChangeAmount={setAmountDraft}
				onClose={closeDialog}
				onSubmit={() => saveAmountChange("heal")}
				opened={activeDialog === "heal"}
				pending={updateMutation.isPending}
				title="Heal"
			/>
			<HealthAmountModal
				amountDraft={amountDraft}
				color="red"
				onChangeAmount={setAmountDraft}
				onClose={closeDialog}
				onSubmit={() => saveAmountChange("damage")}
				opened={activeDialog === "damage"}
				pending={updateMutation.isPending}
				title="Damage"
			/>
			<HealthEditModal
				maxDraft={maxDraft}
				onChangeMax={setMaxDraft}
				onChangeTemporary={setTemporaryDraft}
				onClose={closeDialog}
				onSubmit={saveEditChange}
				opened={activeDialog === "edit"}
				pending={updateMutation.isPending}
				temporaryDraft={temporaryDraft}
			/>

			{updateMutation.error && (
				<Alert color="red" title="Health update failed" variant="light">
					Try the change again.
				</Alert>
			)}
		</Stack>
	);
}

function formatTemporaryHp(temporaryHp: number) {
	return `Temp HP ${temporaryHp > 0 ? `+${temporaryHp}` : temporaryHp}`;
}

function toWholeNumber(value: NumberDraft) {
	return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}
