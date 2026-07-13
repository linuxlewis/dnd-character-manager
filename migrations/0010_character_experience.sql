ALTER TABLE characters
	ADD COLUMN IF NOT EXISTS experience_points integer NOT NULL DEFAULT 0;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'characters_experience_points_check'
	) THEN
		ALTER TABLE characters
			ADD CONSTRAINT characters_experience_points_check
			CHECK (experience_points BETWEEN 0 AND 9999999);
	END IF;
END $$;
