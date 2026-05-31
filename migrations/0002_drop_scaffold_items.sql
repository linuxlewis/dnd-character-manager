DO $$
BEGIN
	IF to_regclass('public.items') IS NOT NULL THEN
		DROP TABLE items;
	END IF;
END $$;
