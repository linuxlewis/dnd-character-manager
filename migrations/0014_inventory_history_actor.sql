ALTER TABLE inventory_history_entries
	ADD COLUMN IF NOT EXISTS actor_user_id uuid;

ALTER TABLE inventory_history_entries
	ADD CONSTRAINT inventory_history_entries_actor_user_id_fkey
		FOREIGN KEY (actor_user_id) REFERENCES "user" (id) ON DELETE SET NULL;
