ALTER TABLE character_spells
ADD COLUMN spell_source text NOT NULL DEFAULT 'spell'
CHECK (spell_source IN ('spell', 'feature'));

ALTER TABLE character_spells
DROP CONSTRAINT IF EXISTS character_spells_character_slot_spell_unique;

CREATE UNIQUE INDEX character_spells_character_slot_source_spell_idx
ON character_spells (character_id, slot_level, spell_source, spell_index);
