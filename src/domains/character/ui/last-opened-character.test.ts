import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearLastOpenedCharacterId,
	getLastOpenedCharacterId,
	markInitialCharacterRestoreAttempted,
	rememberLastOpenedCharacterId,
	resetLastOpenedCharacterMemoryForTests,
	shouldAttemptInitialCharacterRestore,
} from "./last-opened-character.js";

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
		for (const key of Object.keys(storage)) {
			delete storage[key];
		}
	}),
};

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
	writable: true,
});

beforeEach(() => {
	localStorageMock.clear();
	resetLastOpenedCharacterMemoryForTests();
	vi.clearAllMocks();
});

describe("last-opened-character", () => {
	it("remembers and returns the last opened character id", () => {
		rememberLastOpenedCharacterId("char-123");

		expect(getLastOpenedCharacterId()).toBe("char-123");
		expect(localStorageMock.setItem).toHaveBeenCalledWith("last-opened-character-id", "char-123");
	});

	it("clears the remembered character id", () => {
		rememberLastOpenedCharacterId("char-123");

		clearLastOpenedCharacterId();

		expect(getLastOpenedCharacterId()).toBeNull();
		expect(localStorageMock.removeItem).toHaveBeenCalledWith("last-opened-character-id");
	});

	it("only attempts the initial restore once when the app starts on root", () => {
		expect(shouldAttemptInitialCharacterRestore("/")).toBe(true);
		markInitialCharacterRestoreAttempted();
		expect(shouldAttemptInitialCharacterRestore("/")).toBe(false);
	});

	it("does not redirect after an initial non-root load followed by a later visit home", () => {
		expect(shouldAttemptInitialCharacterRestore("/character/abc")).toBe(false);
		markInitialCharacterRestoreAttempted();
		expect(shouldAttemptInitialCharacterRestore("/")).toBe(false);
	});
});
