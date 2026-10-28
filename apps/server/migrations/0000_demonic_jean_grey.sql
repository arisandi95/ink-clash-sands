CREATE TABLE `game_players` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`game_id` bigint NOT NULL,
	`nickname` varchar(24) NOT NULL,
	`team` enum('A','B'),
	`score` int NOT NULL DEFAULT 0,
	`rank_pos` int NOT NULL DEFAULT 0,
	CONSTRAINT `game_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`room_code` char(6) NOT NULL,
	`mode` enum('classic','team') NOT NULL,
	`category` varchar(32) NOT NULL,
	`rounds` int NOT NULL,
	`draw_seconds` int NOT NULL,
	`started_at` datetime NOT NULL,
	`ended_at` datetime,
	`winner_team` enum('A','B'),
	`score_team_a` int,
	`score_team_b` int,
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `turns` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`game_id` bigint NOT NULL,
	`round` int NOT NULL,
	`drawer_nickname` varchar(24) NOT NULL,
	`word` varchar(64) NOT NULL,
	`drawing_team` enum('A','B'),
	`correct_guessers` int NOT NULL DEFAULT 0,
	`started_at` datetime NOT NULL,
	`ended_at` datetime NOT NULL,
	CONSTRAINT `turns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `words` (
	`id` int AUTO_INCREMENT NOT NULL,
	`text` varchar(64) NOT NULL,
	`category` varchar(32) NOT NULL,
	`lang` char(2) NOT NULL DEFAULT 'id',
	`active` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `words_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_word_cat` UNIQUE(`text`,`category`)
);
--> statement-breakpoint
ALTER TABLE `game_players` ADD CONSTRAINT `game_players_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `turns` ADD CONSTRAINT `turns_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_game_player_game` ON `game_players` (`game_id`);--> statement-breakpoint
CREATE INDEX `idx_game_player_nick` ON `game_players` (`nickname`);--> statement-breakpoint
CREATE INDEX `idx_turn_game` ON `turns` (`game_id`);