import { AlertTriangle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import { Skeleton } from "../../../app/components/ui/skeleton.tsx";
import { useNavigate } from "../../../app/router.tsx";
import type { Character } from "../types/index.js";
import { CharacterCard } from "./CharacterCard.tsx";

// Static skeleton keys to avoid array index lint warning
const SKELETON_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"];

export function CharacterList() {
	const navigate = useNavigate();
	const [characters, setCharacters] = useState<Character[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/characters")
			.then((r) => {
				if (!r.ok) throw new Error("Server error");
				return r.json();
			})
			.then((data) => setCharacters(data))
			.catch(() => {
				toast.error("Failed to load characters");
			})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="max-w-[960px] mx-auto p-6 max-sm:p-3">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-heading font-bold text-foreground">Characters</h1>
				<Button onClick={() => navigate("/character/new")}>
					<Plus className="h-4 w-4" />
					New Character
				</Button>
			</div>
			{loading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{SKELETON_KEYS.map((key) => (
						<div key={key} className="rounded-xl border border-border bg-card p-6">
							<Skeleton className="h-6 w-3/4 mb-2" />
							<Skeleton className="h-4 w-full mb-2" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					))}
				</div>
			) : characters.length === 0 ? (
				<p className="text-center text-muted-foreground py-8 text-lg">
					No characters yet. Create your first adventurer!
				</p>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{characters.map((c) => (
						<button
							key={c.id}
							type="button"
							className="rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all p-6 cursor-pointer hover:border-primary hover:shadow-md text-left"
							onClick={() => navigate(`/character/${c.id}`)}
						>
							<div className="flex items-start justify-between gap-3 mb-1">
								<div className="text-lg font-bold text-foreground">{c.name}</div>
								{c.conditions.length > 0 && (
									<Badge variant="destructive" className="gap-1">
										<AlertTriangle className="h-3 w-3" />
										{c.conditions.length}
									</Badge>
								)}
							</div>
							<div className="text-sm text-muted-foreground mb-2">
								{c.race} · {c.class} · Level {c.level}
							</div>
							<div className="flex items-center gap-2 flex-wrap mb-2">
								<div className="text-sm font-semibold text-destructive">
									HP: {c.hp.current} / {c.hp.max}
									{c.hp.temp > 0 ? ` (+${c.hp.temp} temp)` : ""}
								</div>
								{c.concentration && <Badge variant="secondary">Concentration</Badge>}
							</div>
							{c.conditions.length > 0 && (
								<div className="flex gap-1 flex-wrap">
									{c.conditions.slice(0, 3).map((condition) => (
										<Badge key={condition.name} variant="outline">
											{condition.name}
										</Badge>
									))}
									{c.conditions.length > 3 && (
										<Badge variant="outline">+{c.conditions.length - 3} more</Badge>
									)}
								</div>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
