CREATE TABLE IF NOT EXISTS character_health (
	character_id uuid PRIMARY KEY REFERENCES characters (id) ON DELETE CASCADE,
	current_hp integer NOT NULL CHECK (current_hp >= 0),
	max_hp integer NOT NULL CHECK (max_hp >= 1),
	temporary_hp integer NOT NULL DEFAULT 0 CHECK (temporary_hp >= 0),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT character_health_current_within_effective_max
		CHECK (current_hp <= max_hp + temporary_hp)
);

INSERT INTO character_health (character_id, current_hp, max_hp, temporary_hp)
SELECT id, 1, 1, 0
FROM characters
ON CONFLICT (character_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS character_health_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	character_id uuid NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
	previous_current_hp integer NOT NULL CHECK (previous_current_hp >= 0),
	next_current_hp integer NOT NULL CHECK (next_current_hp >= 0),
	previous_max_hp integer NOT NULL CHECK (previous_max_hp >= 1),
	next_max_hp integer NOT NULL CHECK (next_max_hp >= 1),
	previous_temporary_hp integer NOT NULL CHECK (previous_temporary_hp >= 0),
	next_temporary_hp integer NOT NULL CHECK (next_temporary_hp >= 0),
	current_hp_delta integer NOT NULL,
	max_hp_delta integer NOT NULL,
	temporary_hp_delta integer NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_health_events_character_created_idx
	ON character_health_events (character_id, created_at DESC);
