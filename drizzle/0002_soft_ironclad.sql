CREATE TABLE `game_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entitlement_id` text NOT NULL,
	`top_critic_average` integer,
	`critics_recommend` integer,
	`player_rating` text,
	`tier` text,
	`url` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`entitlement_id`) REFERENCES `purchased_games`(`entitlement_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_ratings_entitlement_id_unique` ON `game_ratings` (`entitlement_id`);