import { Button, Group, Modal, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { CharacterDetailResponse } from "../../../generated/api-client.generated.js";
import { apiMutations, apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterHealth, HealthChangeResponse } from "../types/index.js";
import { HealthAmountModal, HealthEditModal, type NumberDraft } from "./health-dialogs.js";
import { formatHealthChange } from "./health-display.js";

import classes from "./health-workspace.module.css";

type HealthDialog = "damage" | "edit" | "heal" | null;

export function CharacterHealthPanel({
	characterId,
	health,
	recentHealthChanges,
	historyOpened = false,
	onCloseHistory = () => {},
}: {
	characterId: string;
	health: CharacterHealth;
	recentHealthChanges: HealthChangeResponse[];
	historyOpened?: boolean;
	onCloseHistory?: () => void;
}) {
	const [activeDialog, setActiveDialog] = useState<HealthDialog>(null);
	const [amountDraft, setAmountDraft] = useState<NumberDraft>("");
	const [maxDraft, setMaxDraft] = useState<NumberDraft>(health.maxHp);
	const [temporaryDraft, setTemporaryDraft] = useState<NumberDraft>(health.temporaryHp);
	const queryClient = useQueryClient();
	const updateMutation = useMutation({
		...apiMutations.updateCharacterHealth(),
		onSuccess: (response) => {
			setActiveDialog(null);
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
		updateMutation.reset();
		setAmountDraft("");
		setActiveDialog(dialog);
	}

	function openEditDialog() {
		updateMutation.reset();
		setMaxDraft(health.maxHp);
		setTemporaryDraft(health.temporaryHp);
		setActiveDialog("edit");
	}

	function closeDialog() {
		if (updateMutation.isPending) return;
		setActiveDialog(null);
		setAmountDraft("");
		setMaxDraft(health.maxHp);
		setTemporaryDraft(health.temporaryHp);
	}

	function saveHealth(patch: Partial<CharacterHealth>) {
		if (updateMutation.isPending) return;
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
		const currentHp = previewHealthAmount(health, amount, direction);
		if (currentHp !== null) saveHealth({ currentHp });
	}

	function saveEditChange() {
		const maxHp = toWholeNumber(maxDraft);
		const temporaryHp = toWholeNumber(temporaryDraft);
		if (!maxHp || maxHp < 1 || temporaryHp === null || temporaryHp < 0) return;
		saveHealth({ maxHp, temporaryHp });
	}

	return (
		<>
			<div className={classes.healthRow}>
				<UnstyledButton
					className={classes.readout}
					onClick={openEditDialog}
					aria-label={`Edit health: ${health.currentHp} / ${health.effectiveMaxHp} HP`}
				>
					<div className={classes.amount}>
						HP {health.currentHp}/{health.effectiveMaxHp}
					</div>
					{health.temporaryHp > 0 && (
						<div className={classes.temporary}>Temp HP +{health.temporaryHp}</div>
					)}
				</UnstyledButton>
				<Button c="black" mih={44} px="xs" color="green" onClick={() => openAmountDialog("heal")}>
					Heal
				</Button>
				<Button c="black" mih={44} px="xs" color="red" onClick={() => openAmountDialog("damage")}>
					Damage
				</Button>
			</div>
			<Modal
				opened={historyOpened}
				onClose={onCloseHistory}
				title="Health history"
				closeButtonProps={{ "aria-label": "Close", size: 44 }}
			>
				<Stack gap="xs">
					{recentHealthChanges.length === 0 ? (
						<Text>No health changes yet.</Text>
					) : (
						recentHealthChanges.map((change) => (
							<Group key={change.id} justify="space-between">
								<Text size="sm">{formatHealthChange(change)}</Text>
								<Text c="dimmed" size="sm">
									{new Date(change.createdAt).toLocaleString()}
								</Text>
							</Group>
						))
					)}
				</Stack>
			</Modal>

			<HealthAmountModal
				amountDraft={amountDraft}
				color="green"
				onChangeAmount={setAmountDraft}
				onClose={closeDialog}
				onSubmit={() => saveAmountChange("heal")}
				opened={activeDialog === "heal"}
				pending={updateMutation.isPending}
				preview={previewHealthAmount(health, amountDraft, "heal")}
				error={Boolean(updateMutation.error)}
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
				preview={previewHealthAmount(health, amountDraft, "damage")}
				error={Boolean(updateMutation.error)}
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
				error={Boolean(updateMutation.error)}
			/>
		</>
	);
}

function toWholeNumber(value: NumberDraft) {
	return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function previewHealthAmount(
	health: CharacterHealth,
	amount: NumberDraft,
	direction: "heal" | "damage",
) {
	if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1) return null;
	return clamp(
		health.currentHp + (direction === "heal" ? amount : -amount),
		0,
		health.effectiveMaxHp,
	);
}
