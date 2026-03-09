import { _setDb } from "@providers/db/connection.js";
import * as schema from "@providers/db/schema.js";
/**
 * Global vitest setup — initializes an in-memory SQLite database
 * with the Drizzle schema so all tests use a real DB.
 */
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database(":memory:");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// Create the characters table with all columns including new HP/conditions support
db.run(sql`CREATE TABLE IF NOT EXISTS characters (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	race TEXT NOT NULL,
	class TEXT NOT NULL,
	level INTEGER NOT NULL DEFAULT 1,
	ability_scores TEXT,
	hp TEXT,
	conditions TEXT,
	concentration INTEGER NOT NULL DEFAULT 0,
	spell_slots TEXT,
	equipment TEXT,
	skills TEXT,
	slug TEXT UNIQUE,
	notes TEXT,
	armor_class TEXT,
	saving_throw_proficiencies TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

_setDb(db);
