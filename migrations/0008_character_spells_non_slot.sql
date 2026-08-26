ALTER TABLE character_spells
DROP CONSTRAINT IF EXISTS character_spells_slot_level_check;

ALTER TABLE character_spells
DROP CONSTRAINT IF EXISTS character_spells_spell_level_check;

ALTER TABLE character_spells
ADD CONSTRAINT character_spells_slot_level_check
CHECK (slot_level BETWEEN 0 AND 9);

ALTER TABLE character_spells
ADD CONSTRAINT character_spells_spell_level_check
CHECK (spell_level BETWEEN 0 AND 20);
