export {
	CharacterSchema,
	CreateCharacterSchema,
	UpdateCharacterSchema,
	AbilityScoresSchema,
	AbilityKeySchema,
	HpSchema,
	getAbilityModifier,
	applyDamage,
	applyHealing,
	setTempHp,
	setMaxHp,
	type Character,
	type CreateCharacter,
	type UpdateCharacter,
	type AbilityScores,
	type AbilityKey,
	type Hp,
	SpellSlotSchema,
	type SpellSlot,
	EquipmentItemSchema,
	type EquipmentItem,
	calculateTotalWeight,
	ArmorClassSchema,
	calculateAC,
	type ArmorClass,
} from "./character.js";

export {
	CharacterConditionNameSchema,
	CharacterConditionSchema,
	CONDITION_DETAILS,
	toggleCondition,
	type CharacterConditionName,
	type CharacterCondition,
} from "./conditions.js";

export { generateSlug } from "./slug.js";

export {
	SkillSchema,
	SKILLS,
	getProficiencyBonus,
	calculateSkillBonus,
	calculateSavingThrow,
	type Skill,
} from "./skills.js";

export {
	ItemCategorySchema,
	ITEM_CATEGORIES,
	ITEM_CATEGORY_LABELS,
	AddEquipmentItemSchema,
	UpdateEquipmentItemSchema,
	calculateCarryingCapacity,
	isEncumbered,
	toggleEquipItem,
	updateEquipmentItem,
	type ItemCategory,
	type AddEquipmentItem,
	type UpdateEquipmentItem,
} from "./equipment.js";
