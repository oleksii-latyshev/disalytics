CREATE TABLE `lineup_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`map` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `lineup_collections_map` ON `lineup_collections` (`map`);