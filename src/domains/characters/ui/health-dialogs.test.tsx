import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HealthAmountModal, HealthEditModal } from "./health-dialogs.js";

describe("health dialogs", () => {
	it("renders amount and edit dialog fields without number controls", () => {
		const amountHtml = renderToString(
			<MantineProvider>
				<HealthAmountModal
					amountDraft=""
					color="green"
					onChangeAmount={vi.fn()}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					pending={false}
					title="Heal"
				/>
			</MantineProvider>,
		);
		const editHtml = renderToString(
			<MantineProvider>
				<HealthEditModal
					maxDraft={20}
					onChangeMax={vi.fn()}
					onChangeTemporary={vi.fn()}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
					opened
					pending={false}
					temporaryDraft={5}
				/>
			</MantineProvider>,
		);

		expect(amountHtml).toContain("Amount");
		expect(editHtml).toContain("Max HP");
		expect(editHtml).toContain("Temp HP");
		expect(`${amountHtml}${editHtml}`).toContain("Save");
	});
});
