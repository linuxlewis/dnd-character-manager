ALTER TABLE `characters` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `characters_slug_unique` ON `characters` (`slug`);