import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../app/components/ui/button.tsx";
import { useNavigate } from "../../../app/router.tsx";
import type { Character } from "../types/index.js";

export function CharacterList() {
	const navigate = useNavigate();
	const [characters, setCharacters] = useState<Character[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/characters")
			.then((r) => r.json())
			.then((data) => setCharacters(data))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="max-w-[960px] mx-auto p-6 max-sm:p-2">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-heading text-foreground">Characters</h1>
				<Button onClick={() => navigate("/character/new")}>
					<Plus className="h-4 w-4" />
					New Character
				</Button>
			</div>
			{loading ? (
				<p className="text-muted-foreground">Loading...</p>
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
							<div className="text-lg font-bold mb-1 text-foreground">{c.name}</div>
							<div className="text-sm text-muted-foreground mb-2">
								{c.race} · {c.class} · Level {c.level}
							</div>
							<div className="text-sm font-semibold text-destructive">
								HP: {c.hp.current} / {c.hp.max}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
