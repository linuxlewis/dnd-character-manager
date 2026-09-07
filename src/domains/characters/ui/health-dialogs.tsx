import { Alert, Box, Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core";

import classes from "./health-workspace.module.css";

export type NumberDraft = "" | number;

export function HealthAmountModal({
	amountDraft,
	color,
	onChangeAmount,
	onClose,
	onSubmit,
	opened,
	pending,
	title,
	preview,
	error,
	withinPortal = true,
}: {
	amountDraft: NumberDraft;
	color: "green" | "red";
	onChangeAmount: (value: NumberDraft) => void;
	onClose: () => void;
	onSubmit: () => void;
	opened: boolean;
	pending: boolean;
	title: string;
	preview: number | null;
	error?: boolean;
	withinPortal?: boolean;
}) {
	return (
		<Modal
			withinPortal={withinPortal}
			classNames={{
				inner: classes.sheetInner,
				content: classes.sheetContent,
				body: classes.sheetBody,
			}}
			onClose={onClose}
			opened={opened}
			title={title}
			closeOnClickOutside={!pending}
			closeOnEscape={!pending}
			closeButtonProps={{ "aria-label": "Close", size: 44, disabled: pending }}
		>
			<Box
				component="form"
				onSubmit={(event) => {
					event.preventDefault();
					if (!pending) onSubmit();
				}}
			>
				<Stack gap="md">
					<NumberInput
						allowDecimal={false}
						allowNegative={false}
						data-autofocus
						hideControls
						label="Amount"
						min={1}
						required
						size="md"
						onChange={(value) => onChangeAmount(toDraft(value))}
						value={amountDraft}
					/>
					<Text role="status">
						{preview === null
							? "Enter an amount to preview HP."
							: `Resulting HP: ${preview} (preview)`}
					</Text>
					{error && (
						<Alert color="red" title="Health update failed">
							Your amount is kept. Try again.
						</Alert>
					)}
					<Group className={classes.actions} justify="flex-end">
						<Button mih={44} disabled={pending} onClick={onClose} type="button" variant="default">
							Cancel
						</Button>
						<Button
							c="black"
							mih={44}
							color={color}
							disabled={preview === null}
							loading={pending}
							type="submit"
						>
							{title === "Heal" ? "Apply healing" : "Apply damage"}
						</Button>
					</Group>
				</Stack>
			</Box>
		</Modal>
	);
}

export function HealthEditModal({
	maxDraft,
	onChangeMax,
	onChangeTemporary,
	onClose,
	onSubmit,
	opened,
	pending,
	temporaryDraft,
	error,
	withinPortal = true,
}: {
	maxDraft: NumberDraft;
	onChangeMax: (value: NumberDraft) => void;
	onChangeTemporary: (value: NumberDraft) => void;
	onClose: () => void;
	onSubmit: () => void;
	opened: boolean;
	pending: boolean;
	temporaryDraft: NumberDraft;
	error?: boolean;
	withinPortal?: boolean;
}) {
	return (
		<Modal
			withinPortal={withinPortal}
			classNames={{
				inner: classes.sheetInner,
				content: classes.sheetContent,
				body: classes.sheetBody,
			}}
			onClose={onClose}
			opened={opened}
			title="Edit health"
			closeOnClickOutside={!pending}
			closeOnEscape={!pending}
			closeButtonProps={{ "aria-label": "Close", size: 44, disabled: pending }}
		>
			<Box
				component="form"
				onSubmit={(event) => {
					event.preventDefault();
					if (!pending) onSubmit();
				}}
			>
				<Stack gap="md">
					<NumberInput
						allowDecimal={false}
						allowNegative={false}
						hideControls
						label="Max HP"
						min={1}
						required
						size="md"
						onChange={(value) => onChangeMax(toDraft(value))}
						value={maxDraft}
					/>
					<NumberInput
						allowDecimal={false}
						allowNegative={false}
						hideControls
						label="Temp HP"
						min={0}
						required
						size="md"
						onChange={(value) => onChangeTemporary(toDraft(value))}
						value={temporaryDraft}
					/>
					{error && (
						<Alert color="red" title="Health update failed">
							Your changes are kept. Try again.
						</Alert>
					)}
					<Group className={classes.actions} justify="flex-end">
						<Button mih={44} disabled={pending} onClick={onClose} type="button" variant="default">
							Cancel
						</Button>
						<Button c="black" mih={44} loading={pending} type="submit">
							Save
						</Button>
					</Group>
				</Stack>
			</Box>
		</Modal>
	);
}

function toDraft(value: number | string): NumberDraft {
	return typeof value === "number" && Number.isFinite(value) ? value : "";
}
