CREATE TABLE IF NOT EXISTS character_spell_slots (
	character_id uuid NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
	spell_level integer NOT NULL CHECK (spell_level BETWEEN 1 AND 9),
	total_slots integer NOT NULL DEFAULT 0 CHECK (total_slots >= 0),
	used_slots integer NOT NULL DEFAULT 0 CHECK (used_slots >= 0),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (character_id, spell_level),
	CONSTRAINT character_spell_slots_used_within_total CHECK (used_slots <= total_slots)
);

CREATE INDEX IF NOT EXISTS character_spell_slots_character_idx
	ON character_spell_slots (character_id);

CREATE TABLE IF NOT EXISTS character_spell_slot_events (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	character_id uuid NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
	action text NOT NULL CHECK (action IN ('configured', 'used', 'restored', 'defaults-applied')),
	spell_level integer NOT NULL CHECK (spell_level BETWEEN 1 AND 9),
	previous_total_slots integer NOT NULL CHECK (previous_total_slots >= 0),
	next_total_slots integer NOT NULL CHECK (next_total_slots >= 0),
	previous_used_slots integer NOT NULL CHECK (previous_used_slots >= 0),
	next_used_slots integer NOT NULL CHECK (next_used_slots >= 0),
	total_slots_delta integer NOT NULL,
	used_slots_delta integer NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT character_spell_slot_events_previous_used_within_total
		CHECK (previous_used_slots <= previous_total_slots),
	CONSTRAINT character_spell_slot_events_next_used_within_total
		CHECK (next_used_slots <= next_total_slots)
);

CREATE INDEX IF NOT EXISTS character_spell_slot_events_character_created_idx
	ON character_spell_slot_events (character_id, created_at DESC);
