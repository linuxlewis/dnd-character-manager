/**
 * DiceRollerContext — shared roll state between the header dice roller
 * and character sheet quick-roll buttons.
 */

import { createContext, useCallback, useContext, useState } from "react";
import type { DiceRollInput, DiceRollResult } from "../types/dice.js";
import { MAX_ROLL_HISTORY, rollDice } from "../types/dice.js";

interface DiceRollerContextValue {
	results: DiceRollResult[];
	rolling: boolean;
	roll: (input: DiceRollInput) => void;
	clearHistory: () => void;
}

const DiceRollerContext = createContext<DiceRollerContextValue | null>(null);

export function DiceRollerProvider({ children }: { children: React.ReactNode }) {
	const [results, setResults] = useState<DiceRollResult[]>([]);
	const [rolling, setRolling] = useState(false);

	const roll = useCallback((input: DiceRollInput) => {
		setRolling(true);
		setTimeout(() => {
			const result = rollDice(input);
			setResults((prev) => [result, ...prev].slice(0, MAX_ROLL_HISTORY));
			setRolling(false);
		}, 300);
	}, []);

	const clearHistory = useCallback(() => {
		setResults([]);
	}, []);

	return (
		<DiceRollerContext.Provider value={{ results, rolling, roll, clearHistory }}>
			{children}
		</DiceRollerContext.Provider>
	);
}

export function useDiceRoller(): DiceRollerContextValue {
	const ctx = useContext(DiceRollerContext);
	if (!ctx) {
		throw new Error("useDiceRoller must be used within a DiceRollerProvider");
	}
	return ctx;
}
