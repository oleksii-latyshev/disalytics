CREATE TABLE `photo_links` (
	`url` text PRIMARY KEY NOT NULL,
	`sha256` text NOT NULL,
	`created_at` integer NOT NULL
);
