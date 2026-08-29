CREATE TABLE IF NOT EXISTS inventory_items (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	inventory_scope_id uuid NOT NULL,
	name text NOT NULL,
	type text NOT NULL,
	category text NOT NULL,
	rarity text,
	description text,
	quantity integer NOT NULL DEFAULT 1,
	weight real,
	estimated_value real,
	notes text,
	thumbnail_url text,
	catalogue_item_id uuid,
	catalogue_source_key text,
	catalogue_rules_version text,
	properties jsonb NOT NULL DEFAULT '{}'::jsonb,
	is_equipped boolean NOT NULL DEFAULT false,
	stat_modifiers jsonb,
	stat_overrides jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT inventory_items_inventory_scope_id_fkey
		FOREIGN KEY (inventory_scope_id) REFERENCES inventory_scopes (id) ON DELETE CASCADE,
	CONSTRAINT inventory_items_catalogue_item_id_fkey
		FOREIGN KEY (catalogue_item_id) REFERENCES catalogue_items (id) ON DELETE SET NULL,
	CONSTRAINT inventory_items_name_nonempty_check CHECK (length(name) > 0),
	CONSTRAINT inventory_items_type_check CHECK (type IN ('equipment', 'potion', 'scroll', 'consumable', 'misc')),
	CONSTRAINT inventory_items_category_nonempty_check CHECK (length(category) > 0),
	CONSTRAINT inventory_items_rarity_check
		CHECK (rarity IS NULL OR rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')),
	CONSTRAINT inventory_items_quantity_positive_check CHECK (quantity >= 1),
	CONSTRAINT inventory_items_weight_nonnegative_check CHECK (weight IS NULL OR weight >= 0),
	CONSTRAINT inventory_items_estimated_value_nonnegative_check
		CHECK (estimated_value IS NULL OR estimated_value >= 0)
);

CREATE INDEX IF NOT EXISTS inventory_items_scope_created_idx
	ON inventory_items (inventory_scope_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS inventory_items_scope_type_category_idx
	ON inventory_items (inventory_scope_id, type, category);
CREATE INDEX IF NOT EXISTS inventory_items_scope_type_idx
	ON inventory_items (inventory_scope_id, type);
CREATE INDEX IF NOT EXISTS inventory_items_scope_category_idx
	ON inventory_items (inventory_scope_id, category);
CREATE INDEX IF NOT EXISTS inventory_items_catalogue_item_id_idx
	ON inventory_items (catalogue_item_id);
CREATE INDEX IF NOT EXISTS inventory_items_catalogue_source_key_idx
	ON inventory_items (catalogue_source_key);

CREATE TABLE IF NOT EXISTS inventory_history_entries (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	inventory_scope_id uuid NOT NULL,
	action text NOT NULL CHECK (action IN ('item_added', 'item_updated', 'item_removed', 'currency_updated')),
	entity_type text NOT NULL CHECK (entity_type IN ('item', 'currency')),
	entity_id uuid,
	entity_name text,
	details jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT inventory_history_entries_inventory_scope_id_fkey
		FOREIGN KEY (inventory_scope_id) REFERENCES inventory_scopes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS inventory_history_entries_scope_created_idx
	ON inventory_history_entries (inventory_scope_id, created_at DESC, id DESC);
