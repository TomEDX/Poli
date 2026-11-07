CREATE TYPE "public"."group_position" AS ENUM('for', 'against', 'abstention', 'non_voting');--> statement-breakpoint
CREATE TYPE "public"."vote_result" AS ENUM('adopted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."vote_subject" AS ENUM('whole_text', 'article', 'amendment', 'motion');--> statement-breakpoint
CREATE TABLE "group_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vote_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"position" "group_position" NOT NULL,
	"for_count" integer,
	"against_count" integer,
	"abstention_count" integer,
	"non_voting_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_votes_vote_id_group_id_unique" UNIQUE("vote_id","group_id"),
	CONSTRAINT "group_votes_counts_not_negative" CHECK ("group_votes"."for_count" >= 0 and "group_votes"."against_count" >= 0
          and "group_votes"."abstention_count" >= 0 and "group_votes"."non_voting_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "group_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_id" uuid NOT NULL,
	"subject" "vote_subject" NOT NULL,
	"number" integer NOT NULL,
	"held_on" date NOT NULL,
	"result" "vote_result" NOT NULL,
	"official_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_text_id_number_unique" UNIQUE("text_id","number")
);
--> statement-breakpoint
ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "group_votes" ADD CONSTRAINT "group_votes_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_votes" ADD CONSTRAINT "group_votes_group_id_parliamentary_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."parliamentary_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_text_id_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "group_votes_public_read_published" ON "group_votes" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from votes join texts on texts.id = votes.text_id
                         where votes.id = "group_votes"."vote_id" and texts.status = 'published'));--> statement-breakpoint
CREATE POLICY "votes_public_read_published" ON "votes" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from texts where texts.id = "votes"."text_id" and texts.status = 'published'));