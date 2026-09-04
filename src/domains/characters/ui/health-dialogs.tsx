import { Box, Button, Group, Modal, NumberInput, Stack } from "@mantine/core";

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
}: {
	amountDraft: NumberDraft;
	color: "green" | "red";
	onChangeAmount: (value: NumberDraft) => void;
	onClose: () => void;
	onSubmit: () => void;
	opened: boolean;
	pending: boolean;
	title: string;
}) {
	return (
		<Modal
			closeButtonProps={{ "aria-label": `Close ${title.toLowerCase()} dialog` }}
			onClose={onClose}
			opened={opened}
			styles={modalStyles}
			title={title}
			withinPortal={false}
		>
			<Box
				component="form"
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
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
						onChange={(value) => onChangeAmount(toDraft(value))}
						value={amountDraft}
					/>
					<Group justify="flex-end">
						<Button onClick={onClose} type="button" variant="default">
							Cancel
						</Button>
						<Button color={color} loading={pending} type="submit">
							Save
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
}: {
	maxDraft: NumberDraft;
	onChangeMax: (value: NumberDraft) => void;
	onChangeTemporary: (value: NumberDraft) => void;
	onClose: () => void;
	onSubmit: () => void;
	opened: boolean;
	pending: boolean;
	temporaryDraft: NumberDraft;
}) {
	return (
		<Modal
			closeButtonProps={{ "aria-label": "Close edit health dialog" }}
			onClose={onClose}
			opened={opened}
			styles={modalStyles}
			title="Edit health"
			withinPortal={false}
		>
			<Box
				component="form"
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
				}}
			>
				<Stack gap="md">
					<NumberInput
						allowDecimal={false}
						allowNegative={false}
						hideControls
						label="Max HP"
						min={1}
						onChange={(value) => onChangeMax(toDraft(value))}
						value={maxDraft}
					/>
					<NumberInput
						allowDecimal={false}
						allowNegative={false}
						hideControls
						label="Temp HP"
						min={0}
						onChange={(value) => onChangeTemporary(toDraft(value))}
						value={temporaryDraft}
					/>
					<Group justify="flex-end">
						<Button onClick={onClose} type="button" variant="default">
							Cancel
						</Button>
						<Button loading={pending} type="submit">
							Save
						</Button>
					</Group>
				</Stack>
			</Box>
		</Modal>
	);
}

const modalStyles = {
	content: { maxWidth: "calc(100vw - 2rem)" },
	inner: { left: 0, padding: 0, right: 0 },
};

function toDraft(value: number | string): NumberDraft {
	return typeof value === "number" && Number.isFinite(value) ? value : "";
}
