CREATE TABLE `tactic_revision` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tactics` (
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
CREATE INDEX `tactics_map` ON `tactics` (`map`);