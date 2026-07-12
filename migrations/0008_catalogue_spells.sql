CREATE TABLE IF NOT EXISTS catalogue_spells (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	source text NOT NULL CHECK (length(source) > 0),
	source_key text NOT NULL CHECK (length(source_key) > 0),
	source_path text NOT NULL CHECK (length(source_path) > 0),
	rules_version text NOT NULL CHECK (rules_version IN ('2014', '2024')),
	license text NOT NULL,
	spell_index text NOT NULL CHECK (length(spell_index) > 0),
	spell_name text NOT NULL CHECK (length(spell_name) > 0),
	spell_level integer NOT NULL CHECK (spell_level BETWEEN 0 AND 9),
	spell_url text NOT NULL CHECK (length(spell_url) > 0),
	spell_desc jsonb NOT NULL,
	spell_higher_level jsonb NOT NULL DEFAULT '[]'::jsonb,
	spell_metadata jsonb NOT NULL DEFAULT '[]'::jsonb,
	source_payload jsonb NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT catalogue_spells_source_key_unique UNIQUE (source, source_key),
	CONSTRAINT catalogue_spells_spell_index_unique UNIQUE (spell_index)
);

CREATE INDEX IF NOT EXISTS catalogue_spells_name_idx ON catalogue_spells (spell_name);
CREATE INDEX IF NOT EXISTS catalogue_spells_level_name_idx
	ON catalogue_spells (spell_level, spell_name);
