import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
	CreateCharacterForm,
	validateCharacterClass,
	validateCharacterLevel,
	validateCharacterName,
} from "./create-character-form.js";

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

describe("create character validation", () => {
	it("validates names, class selection, and level range", () => {
		expect(validateCharacterName(" ")).toBe("Name is required");
		expect(validateCharacterName("x".repeat(121))).toBe("Name must be 120 characters or fewer");
		expect(validateCharacterName("Vera")).toBeNull();
		expect(validateCharacterClass("")).toBe("Class is required");
		expect(validateCharacterClass("Wizard")).toBeNull();
		expect(validateCharacterLevel(0)).toBe("Level must be a whole number from 1 to 20");
		expect(validateCharacterLevel(20)).toBeNull();
	});
});
