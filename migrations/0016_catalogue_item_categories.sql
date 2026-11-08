-- Split the catalogue's catch-all "Other" category into DMG magic item categories.
-- Mirrors categoryForPath in src/domains/catalogue/repo/foundry-item-source.ts so rows
-- seeded before this change match a fresh seed. Owned inventory items keep their copies.
UPDATE catalogue_items
SET
	item_category = CASE
		WHEN starts_with(source_path, 'packs/_source/equipment24/traps/') THEN 'Traps'
		WHEN starts_with(source_path, 'packs/_source/equipment24/containers/') THEN 'Wondrous Items'
		WHEN starts_with(source_path, 'packs/_source/equipment24/equipment/rings/')
			OR stats ->> 'itemType' = 'ring' THEN 'Rings'
		WHEN starts_with(source_path, 'packs/_source/equipment24/equipment/rods/')
			OR stats ->> 'itemType' = 'rod' THEN 'Rods'
		WHEN starts_with(source_path, 'packs/_source/equipment24/equipment/wands/')
			OR stats ->> 'itemType' = 'wand' THEN 'Wands'
		WHEN starts_with(source_path, 'packs/_source/equipment24/equipment/') THEN 'Wondrous Items'
		WHEN stats ->> 'itemType' = 'scroll' THEN 'Scrolls'
		WHEN stats ->> 'itemType' = 'natural' THEN 'Weapons'
		ELSE item_category
	END,
	updated_at = now()
WHERE source = 'foundry-dnd5e' AND item_category = 'Other';
