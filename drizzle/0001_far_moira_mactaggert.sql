CREATE TABLE `purchased_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`concept_id` text,
	`entitlement_id` text NOT NULL,
	`image_url` text,
	`is_active` integer,
	`is_downloadable` integer,
	`is_pre_order` integer,
	`membership` text,
	`name` text NOT NULL,
	`platform` text,
	`product_id` text,
	`title_id` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchased_games_entitlement_id_unique` ON `purchased_games` (`entitlement_id`);