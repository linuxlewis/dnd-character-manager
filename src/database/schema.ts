export * from "../domains/catalogue/schema/index.js";
export * from "../domains/characters/schema/index.js";
export * from "../domains/health/schema/index.js";
export * from "../domains/inventory/schema/index.js";
export {
	accountTable,
	sessionTable,
	userTable,
	verificationTable,
} from "../providers/auth/schema.js";
export { characterRelations } from "./character-relations.js";
