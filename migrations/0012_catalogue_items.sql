CREATE TABLE IF NOT EXISTS catalogue_items (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	source text NOT NULL CHECK (length(source) > 0),
	source_key text NOT NULL CHECK (length(source_key) > 0),
	source_path text NOT NULL CHECK (length(source_path) > 0),
	source_revision text NOT NULL CHECK (length(source_revision) > 0),
	source_url text NOT NULL CHECK (length(source_url) > 0),
	rules_version text NOT NULL CHECK (rules_version IN ('2014', '2024')),
	license text NOT NULL,
	seed_capability text NOT NULL CHECK (seed_capability = 'equipment'),
	seed_pack text NOT NULL CHECK (seed_pack = 'equipment24'),
	seed_metadata jsonb NOT NULL,
	item_identifier text NOT NULL CHECK (length(item_identifier) > 0),
	item_name text NOT NULL CHECK (length(item_name) > 0),
	item_kind text NOT NULL CHECK (length(item_kind) > 0),
	item_category text NOT NULL CHECK (length(item_category) > 0),
	item_description text NOT NULL,
	is_magical boolean NOT NULL,
	item_rarity text,
	requires_attunement boolean NOT NULL,
	cost_value double precision CHECK (cost_value IS NULL OR cost_value >= 0),
	cost_denomination text,
	weight double precision CHECK (weight IS NULL OR weight >= 0),
	thumbnail_url text,
	properties jsonb NOT NULL,
	stats jsonb NOT NULL,
	source_payload jsonb NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT catalogue_items_source_identity_unique UNIQUE (source, source_key, rules_version)
);

CREATE INDEX IF NOT EXISTS catalogue_items_name_idx ON catalogue_items (item_name);
CREATE INDEX IF NOT EXISTS catalogue_items_kind_category_idx ON catalogue_items (item_kind, item_category);
CREATE INDEX IF NOT EXISTS catalogue_items_rules_name_idx ON catalogue_items (rules_version, item_name);

CREATE TABLE IF NOT EXISTS catalogue_item_seed_audits (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	source text NOT NULL,
	source_revision text NOT NULL,
	rules_version text NOT NULL CHECK (rules_version IN ('2014', '2024')),
	capability text NOT NULL CHECK (capability = 'equipment'),
	pack text NOT NULL CHECK (pack = 'equipment24'),
	processed integer NOT NULL CHECK (processed >= 0),
	accepted integer NOT NULL CHECK (accepted >= 0),
	rejected integer NOT NULL CHECK (rejected >= 0),
	category_counts jsonb NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT catalogue_item_seed_audits_identity_unique UNIQUE (source, source_revision, pack)
);
