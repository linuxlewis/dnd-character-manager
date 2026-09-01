CREATE TABLE IF NOT EXISTS inventory_scopes (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	character_id uuid NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT inventory_scopes_character_id_fkey
		FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
	CONSTRAINT inventory_scopes_character_id_unique UNIQUE (character_id)
);

CREATE TABLE IF NOT EXISTS inventory_treasuries (
	inventory_scope_id uuid PRIMARY KEY,
	copper integer NOT NULL DEFAULT 0,
	silver integer NOT NULL DEFAULT 0,
	gold integer NOT NULL DEFAULT 0,
	platinum integer NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT inventory_treasuries_inventory_scope_id_fkey
		FOREIGN KEY (inventory_scope_id) REFERENCES inventory_scopes (id) ON DELETE CASCADE,
	CONSTRAINT inventory_treasuries_copper_nonnegative_check CHECK (copper >= 0),
	CONSTRAINT inventory_treasuries_silver_nonnegative_check CHECK (silver >= 0),
	CONSTRAINT inventory_treasuries_gold_nonnegative_check CHECK (gold >= 0),
	CONSTRAINT inventory_treasuries_platinum_nonnegative_check CHECK (platinum >= 0)
);
