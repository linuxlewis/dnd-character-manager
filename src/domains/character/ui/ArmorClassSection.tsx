import { useState } from "react";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import { calculateAC } from "../types/character.js";
import type { Character } from "../types/index.js";

export function ArmorClassSection({
	character,
	characterId,
	onUpdate,
}: {
	character: Character;
	characterId: string;
	onUpdate: (c: Character) => void;
}) {
	const [acOverrideInput, setAcOverrideInput] = useState("");
	const [showAcOverride, setShowAcOverride] = useState(false);

	const acValue = calculateAC(character.abilityScores.DEX, character.armorClass);
	const hasAcOverride = character.armorClass.override !== null;

	const handleSetAcOverride = () => {
		const value = Number.parseInt(acOverrideInput, 10);
		if (Number.isNaN(value) || value < 0) return;
		fetch(`/api/characters/${characterId}/ac`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ override: value }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					onUpdate(data);
					setShowAcOverride(false);
					setAcOverrideInput("");
				}
			})
			.catch(() => {});
	};

	const handleClearAcOverride = () => {
		fetch(`/api/characters/${characterId}/ac`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ override: null }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Armor Class
			</h2>
			<div className="flex items-center gap-4 mb-2">
				<div className="flex flex-col items-center justify-center w-16 h-[4.5rem] border-2 border-border rounded-b-[50%] bg-muted transition-colors">
					<span className="text-2xl font-bold text-foreground leading-none" data-testid="ac-value">
						{acValue}
					</span>
					<span className="text-[0.7rem] text-muted-foreground uppercase">AC</span>
				</div>
				{hasAcOverride && <Badge>Override</Badge>}
			</div>
			<div className="flex gap-2">
				{hasAcOverride ? (
					<Button variant="outline" size="sm" onClick={handleClearAcOverride}>
						Clear Override
					</Button>
				) : !showAcOverride ? (
					<Button variant="outline" size="sm" onClick={() => setShowAcOverride(true)}>
						Override AC
					</Button>
				) : (
					<div className="flex gap-2 items-center">
						<Input
							type="number"
							className="w-20"
							value={acOverrideInput}
							onChange={(e) => setAcOverrideInput(e.target.value)}
							placeholder="AC"
							min="0"
						/>
						<Button size="sm" onClick={handleSetAcOverride}>
							Set
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setShowAcOverride(false);
								setAcOverrideInput("");
							}}
						>
							Cancel
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
