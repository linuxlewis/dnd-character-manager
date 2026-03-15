const LAST_OPENED_CHARACTER_STORAGE_KEY = "last-opened-character-id";

let hasCheckedInitialCharacterRestore = false;

function getStorage() {
	if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
		return null;
	}
	return globalThis.localStorage;
}

export function rememberLastOpenedCharacterId(characterId: string) {
	if (!characterId) {
		return;
	}
	getStorage()?.setItem(LAST_OPENED_CHARACTER_STORAGE_KEY, characterId);
}

export function getLastOpenedCharacterId() {
	return getStorage()?.getItem(LAST_OPENED_CHARACTER_STORAGE_KEY) ?? null;
}

export function clearLastOpenedCharacterId() {
	getStorage()?.removeItem(LAST_OPENED_CHARACTER_STORAGE_KEY);
}

export function shouldAttemptInitialCharacterRestore(currentPath: string) {
	if (hasCheckedInitialCharacterRestore) {
		return false;
	}
	hasCheckedInitialCharacterRestore = true;
	return currentPath === "/";
}

export function resetLastOpenedCharacterMemoryForTests() {
	hasCheckedInitialCharacterRestore = false;
}
