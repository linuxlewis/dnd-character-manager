import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeProvider.tsx";

// Mock localStorage
const storage: Record<string, string> = {};
const localStorageMock = {
	getItem: vi.fn((key: string) => storage[key] ?? null),
	setItem: vi.fn((key: string, value: string) => {
		storage[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete storage[key];
	}),
	clear: vi.fn(() => {
		for (const k of Object.keys(storage)) delete storage[k];
	}),
	get length() {
		return Object.keys(storage).length;
	},
	key: vi.fn((_i: number) => null),
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

// Mock matchMedia
Object.defineProperty(globalThis, "matchMedia", {
	value: vi.fn((query: string) => ({
		matches: false,
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	})),
	writable: true,
});

beforeEach(() => {
	localStorageMock.clear();
	vi.clearAllMocks();
});

describe("ThemeProvider", () => {
	it("exports ThemeProvider and useTheme", () => {
		expect(ThemeProvider).toBeDefined();
		expect(useTheme).toBeDefined();
	});

	it("reads theme from localStorage", () => {
		storage.theme = "dark";
		function TestComponent() {
			const { theme } = useTheme();
			return <span data-testid="theme">{theme}</span>;
		}
		const html = renderToString(
			<ThemeProvider>
				<TestComponent />
			</ThemeProvider>,
		);
		expect(html).toContain("dark");
	});

	it("defaults to light when no localStorage or system preference", () => {
		function TestComponent() {
			const { theme } = useTheme();
			return <span>{theme}</span>;
		}
		const html = renderToString(
			<ThemeProvider>
				<TestComponent />
			</ThemeProvider>,
		);
		expect(html).toContain("light");
	});

	it("falls back to system preference when no localStorage", () => {
		Object.defineProperty(globalThis, "matchMedia", {
			value: vi.fn((query: string) => ({
				matches: query === "(prefers-color-scheme: dark)",
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
			writable: true,
		});
		function TestComponent() {
			const { theme } = useTheme();
			return <span>{theme}</span>;
		}
		const html = renderToString(
			<ThemeProvider>
				<TestComponent />
			</ThemeProvider>,
		);
		expect(html).toContain("dark");
	});

	it("useTheme throws outside provider", () => {
		function Bad() {
			useTheme();
			return null;
		}
		expect(() => renderToString(<Bad />)).toThrow("useTheme must be used within ThemeProvider");
	});
});

describe("ThemeToggle", () => {
	it("renders sun icon in dark mode", () => {
		storage.theme = "dark";
		// Dynamic import to avoid module-level issues
		const { ThemeToggle } = require("./ThemeToggle.tsx");
		const html = renderToString(
			<ThemeProvider>
				<ThemeToggle />
			</ThemeProvider>,
		);
		expect(html).toContain("☀️");
	});

	it("renders moon icon in light mode", () => {
		storage.theme = "light";
		const { ThemeToggle } = require("./ThemeToggle.tsx");
		const html = renderToString(
			<ThemeProvider>
				<ThemeToggle />
			</ThemeProvider>,
		);
		expect(html).toContain("🌙");
	});

	it("renders a button element", () => {
		const { ThemeToggle } = require("./ThemeToggle.tsx");
		const html = renderToString(
			<ThemeProvider>
				<ThemeToggle />
			</ThemeProvider>,
		);
		expect(html).toContain("<button");
	});
});
