import { useEffect, useState } from "react";
import { useNavigate } from "../../../app/router.tsx";
import type { Character } from "../types/index.js";
import styles from "./CharacterList.module.css";

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
		<div className={styles.container}>
			<h1 className={styles.title}>Characters</h1>
			{loading ? (
				<p>Loading...</p>
			) : characters.length === 0 ? (
				<p className={styles.empty}>No characters yet.</p>
			) : (
				<ul className={styles.list}>
					{characters.map((c) => (
						<li
							key={c.id}
							className={styles.listItem}
							onClick={() => navigate(`/character/${c.id}`)}
							onKeyDown={(e) => {
								if (e.key === "Enter") navigate(`/character/${c.id}`);
							}}
						>
							<div className={styles.charName}>{c.name}</div>
							<div className={styles.charMeta}>
								{c.race} {c.class} · Level {c.level}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
