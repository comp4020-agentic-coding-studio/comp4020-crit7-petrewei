CREATE TABLE `allocations` (
	`activity_id` text PRIMARY KEY NOT NULL,
	`group_label` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
