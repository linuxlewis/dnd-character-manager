/**
 * Global vitest setup — initializes an in-memory SQLite database
 * with the Drizzle schema so all tests use a real DB.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "@providers/db/schema.js";
import { _setDb } from "@providers/db/connection.js";

const sqlite = new Database(":memory:");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// Create the characters table
db.run(sql`CREATE TABLE IF NOT EXISTS characters (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	race TEXT NOT NULL,
	class TEXT NOT NULL,
	level INTEGER NOT NULL DEFAULT 1,
	ability_scores TEXT,
	hp TEXT,
	spell_slots TEXT,
	equipment TEXT,
	skills TEXT,
	notes TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

_setDb(db);
