import "./inventory.css";
import {
	Alert,
	Box,
	Button,
	Divider,
	Group,
	Modal,
	NumberInput,
	Select,
	Stack,
	Text,
	Textarea,
	TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type {
	CreateCharacterItemRequest,
	UpdateCharacterItemRequest,
} from "../../../generated/api-client.generated.js";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { CatalogueItemSearchResult } from "../../catalogue/types/index.js";
import type { InventoryItem } from "../types/index.js";
import { CatalogueItemSearch } from "./catalogue-item-search.js";
import type { ItemFormValues } from "./item-form-values.js";
import {
	catalogueItemIdForSubmission,
	catalogueItemToFormValues,
	initialItemFormValues,
	isCurrentCatalogueRequest,
	toCharacterItemRequest,
	validateItemForm,
} from "./item-form-values.js";
import { INVENTORY_ITEM_TYPES, ITEM_RARITY_LABELS, ITEM_TYPE_LABELS } from "./item-presentation.js";

export function ItemForm({
	mode,
	opened,
	initialItem,
	pending,
	error,
	onClose,
	onSubmit,
	onAfterClose,
}: {
	mode: "create" | "edit";
	opened: boolean;
	initialItem?: InventoryItem;
	pending: boolean;
	error: Error | null;
	onClose: () => void;
	onAfterClose?: () => void;
	onSubmit: (request: CreateCharacterItemRequest | UpdateCharacterItemRequest) => void;
}) {
	const queryClient = useQueryClient();
	const [selectedCatalogueId, setSelectedCatalogueId] = useState<string | null>(null);
	const [detailPendingId, setDetailPendingId] = useState<string | null>(null);
	const [catalogueDetailError, setCatalogueDetailError] = useState<Error | null>(null);
	const catalogueRequestIdRef = useRef(0);
	const form = useFormState(initialItem);

	async function selectCatalogueItem(item: CatalogueItemSearchResult) {
		const requestId = catalogueRequestIdRef.current + 1;
		catalogueRequestIdRef.current = requestId;
		setSelectedCatalogueId(item.id);
		setCatalogueDetailError(null);
		setDetailPendingId(item.id);
		try {
			const details = await queryClient.fetchQuery(
				apiQueries.getCatalogueItemDetails({ catalogueItemId: item.id }),
			);
			if (!isCurrentCatalogueRequest(catalogueRequestIdRef.current, requestId)) return;
			form.setValues({ ...form.values, ...catalogueItemToFormValues(details) });
		} catch (error) {
			if (!isCurrentCatalogueRequest(catalogueRequestIdRef.current, requestId)) return;
			setSelectedCatalogueId(null);
			setCatalogueDetailError(toError(error));
		} finally {
			if (isCurrentCatalogueRequest(catalogueRequestIdRef.current, requestId)) {
				setDetailPendingId(null);
			}
		}
	}

	return (
		<Modal
			returnFocus={false}
			onExitTransitionEnd={onAfterClose}
			closeButtonProps={{
				"aria-label": `${mode === "create" ? "Close add" : "Close edit"} item dialog`,
			}}
			onClose={onClose}
			opened={opened}
			closeOnClickOutside={!pending}
			closeOnEscape={!pending}
			size="lg"
			className="inventory-editor"
			classNames={{
				inner: "inventory-editor-inner",
				content: "inventory-editor-content",
				header: "inventory-editor-header",
				body: "inventory-editor-body",
			}}
			title={mode === "create" ? "Add personal item" : "Edit personal item"}
			withinPortal={false}
		>
			<Box
				component="form"
				className="inventory-editor-form"
				onSubmit={form.onSubmit(
					(values) => {
						if (pending) return;
						onSubmit(
							toCharacterItemRequest(
								values,
								mode,
								catalogueItemIdForSubmission(selectedCatalogueId, catalogueDetailError),
							),
						);
					},
					(errors) => {
						const field = form.getInputNode(Object.keys(errors)[0]);
						field?.focus();
						field?.scrollIntoView({ block: "center" });
					},
				)}
			>
				<Stack className="inventory-editor-scroll" gap="md">
					{mode === "create" && (
						<CatalogueItemSearch
							detailError={catalogueDetailError}
							detailPendingId={detailPendingId}
							onSelect={(item) => void selectCatalogueItem(item)}
							opened={opened}
							selectedCatalogueId={selectedCatalogueId}
						/>
					)}

					<Divider label="Owned item details" labelPosition="center" />
					{error && (
						<Alert color="red" title="Item could not be saved" variant="light">
							{error.message}
						</Alert>
					)}
					<TextInput {...form.getInputProps("name")} label="Name" data-autofocus required />
					<Group align="flex-start" grow wrap="wrap">
						<Select
							{...form.getInputProps("type")}
							allowDeselect={false}
							data={INVENTORY_ITEM_TYPES.map((type) => ({
								value: type,
								label: ITEM_TYPE_LABELS[type],
							}))}
							label="Type"
							required
						/>
						<Select
							{...form.getInputProps("rarity")}
							rightSectionWidth={44}
							clearable
							data={Object.entries(ITEM_RARITY_LABELS).map(([value, label]) => ({ value, label }))}
							label="Rarity"
							placeholder="Unrated"
						/>
					</Group>
					<TextInput {...form.getInputProps("category")} label="Category" required />
					<Group align="flex-start" grow wrap="wrap">
						<NumberInput
							hideControls
							{...form.getInputProps("quantity")}
							allowDecimal={false}
							allowNegative={false}
							label="Quantity"
							min={1}
							required
						/>
						<NumberInput
							hideControls
							{...form.getInputProps("weight")}
							allowDecimal
							allowNegative={false}
							label="Weight (lb)"
							min={0}
						/>
						<NumberInput
							hideControls
							{...form.getInputProps("estimatedValue")}
							allowDecimal
							allowNegative={false}
							label="Value (GP)"
							min={0}
						/>
					</Group>
					<Textarea
						{...form.getInputProps("description")}
						autosize
						label="Description"
						minRows={2}
					/>
					<Textarea
						{...form.getInputProps("notes")}
						autosize
						label="Notes"
						minRows={2}
						placeholder="Personal notes about this item"
					/>
					<TextInput
						{...form.getInputProps("thumbnailUrl")}
						label="Thumbnail URL"
						placeholder="Optional image URL"
					/>
					{selectedCatalogueId && (
						<Text c="dimmed" size="xs">
							Auto-filled from the local SRD catalogue. The saved item keeps its snapshot and source
							rules version.
						</Text>
					)}
				</Stack>
				<Group className="inventory-editor-actions" justify="flex-end">
					<Button disabled={pending} onClick={onClose} type="button" variant="default">
						Cancel
					</Button>
					<Button className="workspace-primary-action" c="black" loading={pending} type="submit">
						{mode === "create" ? "Add item" : "Save item"}
					</Button>
				</Group>
			</Box>
		</Modal>
	);
}

function useFormState(item?: InventoryItem) {
	return useForm<ItemFormValues>({
		mode: "controlled",
		initialValues: initialItemFormValues(item),
		validate: validateItemForm,
	});
}

function toError(error: unknown) {
	return error instanceof Error ? error : new Error("Catalogue details could not be loaded.");
}
