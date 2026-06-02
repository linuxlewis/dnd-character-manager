CREATE TABLE IF NOT EXISTS characters (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
	name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
	class text NOT NULL CHECK (
		class IN (
			'Barbarian',
			'Bard',
			'Cleric',
			'Druid',
			'Fighter',
			'Monk',
			'Paladin',
			'Ranger',
			'Rogue',
			'Sorcerer',
			'Warlock',
			'Wizard'
		)
	),
	level integer NOT NULL CHECK (level BETWEEN 1 AND 20),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS characters_user_created_at_idx ON characters (user_id, created_at DESC);
