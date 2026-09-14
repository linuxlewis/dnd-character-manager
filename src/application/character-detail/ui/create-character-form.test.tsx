import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CreateCharacterForm } from "./create-character-form.js";

describe("CreateCharacterForm", () => {
	it("renders the create form", () => {
		const queryClient = new QueryClient();

		expect(
			renderToString(
				<MantineProvider>
					<QueryClientProvider client={queryClient}>
						<CreateCharacterForm onNavigate={vi.fn()} />
					</QueryClientProvider>
				</MantineProvider>,
			),
		).toContain("Create character");
		expect(
			renderToString(
				<MantineProvider>
					<QueryClientProvider client={queryClient}>
						<CreateCharacterForm onNavigate={vi.fn()} />
					</QueryClientProvider>
				</MantineProvider>,
			),
		).not.toContain("Initial Max HP");
	});
});
