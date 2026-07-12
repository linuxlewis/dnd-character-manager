CREATE TABLE IF NOT EXISTS character_spells (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	character_id uuid NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
	slot_level integer NOT NULL CHECK (slot_level BETWEEN 1 AND 9),
	spell_index text NOT NULL CHECK (length(spell_index) > 0),
	spell_name text NOT NULL CHECK (length(spell_name) > 0),
	spell_level integer NOT NULL CHECK (spell_level BETWEEN 1 AND 20),
	spell_url text NOT NULL CHECK (length(spell_url) > 0),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT character_spells_character_slot_spell_unique
		UNIQUE (character_id, slot_level, spell_index)
);

CREATE INDEX IF NOT EXISTS character_spells_character_level_idx
	ON character_spells (character_id, slot_level);
