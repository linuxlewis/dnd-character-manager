import { afterEach, expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../../domains/characters/service/index.js";
import { getCharacter } from "../query.js";
import { createCharacterDetailService } from "./character-detail.js";

vi.mock("../query.js", () => ({ getCharacter: vi.fn() }));
afterEach(() => vi.clearAllMocks());
it("composes detail after each successful identity edit and propagates denied writes", async () => {
	const calls: string[] = [];
	const identity = {
		listCharacters: vi.fn(),
		transferCharactersToUser: vi.fn(),
		updateCharacterName: vi.fn(async () => {
			calls.push("name");
			return "id";
		}),
		updateCharacterLevel: vi.fn(async () => {
			calls.push("level");
			return "id";
		}),
		updateCharacterExperience: vi.fn(async () => {
			calls.push("experience");
			return "id";
		}),
	};
	vi.mocked(getCharacter).mockImplementation(async () => {
		calls.push("detail");
		throw new CharacterNotFoundError();
	});
	const service = createCharacterDetailService(identity);
	await expect(service.updateCharacterName("owner", "id", { name: "Mira" })).rejects.toThrow(
		CharacterNotFoundError,
	);
	await expect(service.updateCharacterLevel("owner", "id", { level: 2 })).rejects.toThrow(
		CharacterNotFoundError,
	);
	await expect(
		service.updateCharacterExperience("owner", "id", { experiencePoints: 300 }),
	).rejects.toThrow(CharacterNotFoundError);
	expect(calls).toEqual(["name", "detail", "level", "detail", "experience", "detail"]);
	identity.updateCharacterName.mockRejectedValue(new CharacterNotFoundError());
	vi.mocked(getCharacter).mockClear();
	await expect(service.updateCharacterName("other", "id", { name: "Denied" })).rejects.toThrow(
		CharacterNotFoundError,
	);
	expect(getCharacter).not.toHaveBeenCalled();
});
