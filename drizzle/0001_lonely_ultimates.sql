CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`course_code` text NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`allocated_group` text NOT NULL,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`label` text NOT NULL,
	`free` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` text NOT NULL,
	`day` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`location` text NOT NULL,
	`weeks` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`group_id` text PRIMARY KEY NOT NULL,
	`rank` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
