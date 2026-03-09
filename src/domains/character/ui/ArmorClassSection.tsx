import { Shield } from "lucide-react";
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
		<section className="mb-6" aria-label="Armor Class">
			<h2 className="text-base font-heading font-bold text-foreground mb-3 pb-1 border-b-2 border-steel/30 flex items-center gap-2">
				<Shield className="h-4 w-4 text-steel" />
				Armor Class
			</h2>
			<div className="flex items-center gap-4 mb-3">
				<div className="flex flex-col items-center justify-center w-16 h-[4.5rem] border-2 border-steel rounded-b-[50%] bg-card transition-colors shadow-sm">
					<span
						className="text-2xl font-heading font-bold text-foreground leading-none"
						data-testid="ac-value"
					>
						{acValue}
					</span>
					<span className="text-[0.6rem] text-muted-foreground uppercase font-semibold tracking-wider">
						AC
					</span>
				</div>
				{hasAcOverride && <Badge variant="outline">Override</Badge>}
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
							aria-label="AC override value"
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
		</section>
	);
}
