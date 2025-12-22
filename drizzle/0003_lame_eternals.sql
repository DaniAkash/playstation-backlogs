CREATE TABLE `failed_scrapes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entitlement_id` text NOT NULL,
	`game_name` text NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`entitlement_id`) REFERENCES `purchased_games`(`entitlement_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `failed_scrapes_entitlement_id_unique` ON `failed_scrapes` (`entitlement_id`);