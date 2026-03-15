export { characters, type Character, type NewCharacter } from "./schema.js";
export { APP_ROOT, DB_PATH, createDb, getDb, _setDb, type AppDatabase } from "./connection.js";
export { migrate } from "./migrate.js";
