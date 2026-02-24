CREATE TABLE `srd_spells` (
	`index` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`school` text NOT NULL,
	`casting_time` text NOT NULL,
	`range` text NOT NULL,
	`duration` text NOT NULL,
	`description` text NOT NULL,
	`classes` text NOT NULL,
	`cached_at` text DEFAULT (datetime('now')) NOT NULL
);
