ALTER TABLE `courses` ADD `class_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `shared_with` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `meetings` ADD `type` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `meetings` ADD `activity` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `meetings` ADD `staff` text;