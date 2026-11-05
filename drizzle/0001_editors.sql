CREATE TYPE "public"."editor_role" AS ENUM('editor');--> statement-breakpoint
CREATE TABLE "editors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "editor_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editors_email_unique" UNIQUE("email"),
	CONSTRAINT "editors_email_lowercase" CHECK ("editors"."email" = lower("editors"."email"))
);
--> statement-breakpoint
ALTER TABLE "editors" ENABLE ROW LEVEL SECURITY;