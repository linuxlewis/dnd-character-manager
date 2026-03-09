import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import { Checkbox } from "../../../app/components/ui/checkbox.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import { cn } from "../../../app/lib/utils.ts";
import type { Character } from "../types/index.js";

async function updateCharacterJson<T>(url: string, body: unknown): Promise<T | null> {
	const response = await fetch(url, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	return response.ok ? response.json() : null;
}

interface HitPointsSectionProps {
	character: Character;
	hpPercent: number;
	readOnly: boolean;
	onDamage: () => void;
	onHeal: () => void;
	onUpdate: (character: Character) => void;
}

export function HitPointsSection({
	character,
	hpPercent,
	readOnly,
	onDamage,
	onHeal,
	onUpdate,
}: HitPointsSectionProps) {
	const [tempHp, setTempHpValue] = useState(String(character.hp.temp));
	const [maxHp, setMaxHpValue] = useState(String(character.hp.max));
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setTempHpValue(String(character.hp.temp));
		setMaxHpValue(String(character.hp.max));
	}, [character.hp.temp, character.hp.max]);

	const persistNumber = async (
		url: string,
		key: "amount",
		value: string,
		successMessage: string,
	) => {
		const amount = Number.parseInt(value, 10);
		if (Number.isNaN(amount) || amount < 0) {
			toast.error("Enter a valid non-negative number");
			return;
		}
		setIsSaving(true);
		try {
			const data = await updateCharacterJson<Character>(url, { [key]: amount });
			if (data) {
				onUpdate(data);
				toast.success(successMessage);
			} else {
				toast.error("Failed to update HP");
			}
		} catch {
			toast.error("Network error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="mb-6">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1">
				Hit Points
			</h2>
			<div className="mb-2 flex items-center gap-2 flex-wrap">
				<span className="text-lg font-bold text-foreground">
					{character.hp.current} / {character.hp.max}
				</span>
				{character.hp.temp > 0 && <Badge variant="success">+{character.hp.temp} temp</Badge>}
				{character.concentration && <Badge variant="secondary">Concentration</Badge>}
			</div>
			<div className="w-full h-4 bg-muted border border-border rounded-full overflow-hidden mb-3">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-300",
						hpPercent > 50 ? "bg-success" : hpPercent > 25 ? "bg-warning" : "bg-destructive",
					)}
					style={{ width: `${hpPercent}%` }}
				/>
			</div>
			{!readOnly && (
				<>
					<div className="grid grid-cols-2 gap-3 mb-3 max-sm:grid-cols-1">
						<div>
							<label htmlFor="temp-hp" className="text-sm text-muted-foreground block mb-1">
								Temp HP
							</label>
							<Input
								id="temp-hp"
								type="number"
								min={0}
								value={tempHp}
								disabled={isSaving}
								onChange={(e) => setTempHpValue(e.target.value)}
								onBlur={() =>
									persistNumber(
										`/api/characters/${character.id}/hp/temp`,
										"amount",
										tempHp,
										"Temporary HP updated",
									)
								}
							/>
						</div>
						<div>
							<label htmlFor="max-hp" className="text-sm text-muted-foreground block mb-1">
								Max HP
							</label>
							<Input
								id="max-hp"
								type="number"
								min={1}
								value={maxHp}
								disabled={isSaving}
								onChange={(e) => setMaxHpValue(e.target.value)}
								onBlur={() =>
									persistNumber(
										`/api/characters/${character.id}/hp/max`,
										"amount",
										maxHp,
										"Max HP updated",
									)
								}
							/>
						</div>
					</div>
					<div className="flex items-center gap-2 mb-3">
						<Checkbox
							id="concentration"
							checked={character.concentration}
							onCheckedChange={(checked) => {
								updateCharacterJson<Character>(`/api/characters/${character.id}/concentration`, {
									concentration: checked === true,
								})
									.then((data) => {
										if (data) {
											onUpdate(data);
											toast.success(
												checked === true ? "Concentration enabled" : "Concentration cleared",
											);
										}
									})
									.catch(() => toast.error("Network error"));
							}}
						/>
						<label htmlFor="concentration" className="text-sm text-foreground">
							Concentration
						</label>
					</div>
					<div className="flex gap-3 max-sm:flex-col">
						<Button variant="destructive-ghost" className="flex-1" onClick={onDamage}>
							Damage
						</Button>
						<Button variant="success-ghost" className="flex-1" onClick={onHeal}>
							Heal
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
