CREATE TABLE IF NOT EXISTS character_attributes (
	character_id uuid PRIMARY KEY REFERENCES characters (id) ON DELETE CASCADE,
	strength integer NOT NULL DEFAULT 10 CHECK (strength BETWEEN 1 AND 30),
	dexterity integer NOT NULL DEFAULT 10 CHECK (dexterity BETWEEN 1 AND 30),
	constitution integer NOT NULL DEFAULT 10 CHECK (constitution BETWEEN 1 AND 30),
	intelligence integer NOT NULL DEFAULT 10 CHECK (intelligence BETWEEN 1 AND 30),
	wisdom integer NOT NULL DEFAULT 10 CHECK (wisdom BETWEEN 1 AND 30),
	charisma integer NOT NULL DEFAULT 10 CHECK (charisma BETWEEN 1 AND 30),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO character_attributes (character_id, strength, dexterity, constitution, intelligence, wisdom, charisma)
SELECT id, 10, 10, 10, 10, 10, 10
FROM characters
ON CONFLICT (character_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS character_proficiencies (
	character_id uuid NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
	category text NOT NULL,
	key text NOT NULL,
	rank text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (character_id, category, key),
	CONSTRAINT character_proficiencies_category_check
		CHECK (category IN ('skill', 'saving-throw')),
	CONSTRAINT character_proficiencies_rank_check
		CHECK (
			(category = 'skill' AND rank IN ('half', 'proficient', 'expertise'))
			OR (category = 'saving-throw' AND rank = 'proficient')
		)
);
