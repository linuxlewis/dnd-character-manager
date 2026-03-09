import { Plus, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../app/components/ui/button.tsx";
import { Skeleton } from "../../../app/components/ui/skeleton.tsx";
import { useNavigate } from "../../../app/router.tsx";
import type { Character } from "../types/index.js";
import { CharacterCard } from "./CharacterCard.tsx";

const SKELETON_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"];

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
						<div key={key} className="rounded-xl border border-border bg-card p-5">
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1">
									<Skeleton className="h-6 w-3/4 mb-1.5" />
									<Skeleton className="h-4 w-1/2" />
								</div>
								<Skeleton className="h-6 w-12 rounded-full" />
							</div>
							<div className="flex gap-3 mb-3">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-10" />
							</div>
							<Skeleton className="h-2.5 w-full rounded-full mb-3" />
							<div className="flex justify-between pt-2 border-t border-border/50">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-16" />
							</div>
						</div>
					))}
				</div>
			) : characters.length === 0 ? (
				<div className="text-center py-16 animate-fade-in">
					<Swords className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
					<h2 className="text-xl font-heading font-bold text-foreground mb-2">
						No Adventurers Yet
					</h2>
					<p className="text-muted-foreground mb-6 max-w-sm mx-auto">
						Every great quest begins with a hero. Create your first character to begin the
						adventure.
					</p>
					<Button size="lg" onClick={() => navigate("/character/new")}>
						<Plus className="h-5 w-5" />
						Create Your First Character
					</Button>
				</div>
			) : (
				<ul
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0"
					aria-label="Character list"
				>
					{characters.map((c, i) => (
						<li key={c.id}>
							<CharacterCard
								character={c}
								onClick={() => navigate(`/character/${c.id}`)}
								index={i}
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
