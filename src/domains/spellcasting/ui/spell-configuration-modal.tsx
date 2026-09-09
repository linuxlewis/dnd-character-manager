import { Alert, Box, Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
	apiMutations,
	type CharacterSpellSlotsResponse,
} from "../../../generated/api-client.generated.js";
import { type CharacterSpellSlot, SpellSlotCountSchema } from "../types/index.js";

type NumberDraft = number | "";

import { formatSpellLevel } from "./spell-slot-format.js";
import "./spell-workspace.css";

export function CharacterSpellConfiguration({
	characterId,
	level,
	slots,
	onClose,
	onSaved,
}: {
	characterId: string;
	level: number;
	slots: CharacterSpellSlot[];
	onClose: () => void;
	onSaved: (response: CharacterSpellSlotsResponse, characterId: string) => void;
}) {
	const [draftTotals, setDraftTotals] = useState<Record<number, NumberDraft>>({});
	const update = useMutation({
		...apiMutations.updateCharacterSpellSlots(),
		onSuccess: (response, variables) => onSaved(response, variables.params.characterId),
	});
	const defaults = useMutation({
		...apiMutations.applyCharacterSpellSlotDefaults(),
		onSuccess: (response, variables) => onSaved(response, variables.characterId),
	});
	return (
		<SpellConfigurationModal
			opened
			onClose={onClose}
			slots={slots}
			draftTotals={draftTotals}
			onChange={(level, value) => setDraftTotals((current) => ({ ...current, [level]: value }))}
			onSave={() =>
				update.mutate({
					params: { characterId },
					body: {
						slots: slots.map((slot) => ({
							level: slot.level,
							total: Number(draftTotals[slot.level] ?? slot.total),
						})),
					},
				})
			}
			onApplyDefaults={() => defaults.mutate({ characterId })}
			pending={update.isPending || defaults.isPending}
			error={update.error || defaults.error}
			level={level}
		/>
	);
}

export function SpellConfigurationModal({
	opened,
	onClose,
	slots,
	draftTotals,
	onChange,
	onSave,
	onApplyDefaults,
	pending,
	error,
	level,
	withinPortal = true,
}: {
	opened: boolean;
	onClose: () => void;
	slots: CharacterSpellSlot[];
	draftTotals: Record<number, NumberDraft>;
	onChange: (level: number, value: NumberDraft) => void;
	onSave: () => void;
	onApplyDefaults: () => void;
	pending: boolean;
	error: Error | null;
	level: number;
	withinPortal?: boolean;
}) {
	const mobile = useMediaQuery("(max-width: 47.999em)");
	const [invalid, setInvalid] = useState<number[]>([]);
	const inputs = useRef(new Map<number, HTMLInputElement>());
	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (pending) return;
		const invalidLevels = slots
			.filter(
				(slot) => !SpellSlotCountSchema.safeParse(draftTotals[slot.level] ?? slot.total).success,
			)
			.map((slot) => slot.level);
		setInvalid(invalidLevels);
		if (invalidLevels.length > 0) {
			const input = inputs.current.get(invalidLevels[0]);
			input?.scrollIntoView({ block: "center" });
			input?.focus({ preventScroll: true });
			return;
		}
		onSave();
	}
	return (
		<Modal
			withinPortal={withinPortal}
			opened={opened}
			onClose={() => {
				if (!pending) onClose();
			}}
			title="Configure spell slots"
			fullScreen={mobile}
			size="md"
			classNames={{ content: "spell-editor", body: "spell-editor-body" }}
			closeButtonProps={{
				size: "xl",
				"aria-label": "Close spell configuration",
				disabled: pending,
			}}
		>
			<Box component="form" onSubmit={submit} className="spell-editor-form">
				<Stack className="spell-editor-fields" gap="md">
					<Text size="sm" c="dimmed">
						Default profile: tier {level}. Totals must be whole numbers from 0 to 99. Applying class
						defaults saves immediately.
					</Text>
					<Button mih={44} variant="default" disabled={pending} onClick={onApplyDefaults}>
						Apply class defaults
					</Button>
					{slots.map((slot) => (
						<NumberInput
							key={slot.level}
							ref={(node) => {
								if (node) inputs.current.set(slot.level, node);
								else inputs.current.delete(slot.level);
							}}
							label={`${formatSpellLevel(slot.level)} slot total`}
							value={draftTotals[slot.level] ?? slot.total}
							min={0}
							max={99}
							allowDecimal={false}
							allowNegative={false}
							hideControls
							disabled={pending}
							error={
								invalid.includes(slot.level) ? "Enter a whole number from 0 to 99." : undefined
							}
							onChange={(value) => {
								onChange(slot.level, typeof value === "number" ? value : "");
								setInvalid((current) => current.filter((level) => level !== slot.level));
							}}
						/>
					))}
					{error && (
						<Alert
							ref={(node) => node?.scrollIntoView({ block: "nearest" })}
							color="red"
							title="Spell configuration not saved"
						>
							Your changes are still here. Try saving again.
						</Alert>
					)}
				</Stack>
				<Group className="spell-editor-actions" justify="flex-end" gap="xs">
					<Button mih={44} variant="default" disabled={pending} onClick={onClose}>
						Cancel
					</Button>
					<Button
						mih={44}
						className="workspace-primary-action"
						c="black"
						type="submit"
						loading={pending}
						disabled={slots.length === 0}
					>
						Save changes
					</Button>
				</Group>
			</Box>
		</Modal>
	);
}
