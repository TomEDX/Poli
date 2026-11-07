CREATE TYPE "public"."amendment_fate" AS ENUM('adopted', 'rejected', 'withdrawn', 'not_moved', 'fallen', 'inadmissible');--> statement-breakpoint
CREATE TYPE "public"."amendment_opinion" AS ENUM('favourable', 'unfavourable', 'wisdom', 'none');--> statement-breakpoint
CREATE TABLE "amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"author_label" text NOT NULL,
	"author_group_id" uuid,
	"cosignatories" text,
	"summary" text NOT NULL,
	"fate" "amendment_fate" NOT NULL,
	"government_opinion" "amendment_opinion" DEFAULT 'none' NOT NULL,
	"committee_opinion" "amendment_opinion" DEFAULT 'none' NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amendments_text_id_number_unique" UNIQUE("text_id","number")
);
--> statement-breakpoint
ALTER TABLE "amendments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "amendment_id" uuid;--> statement-breakpoint
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_text_id_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_author_group_id_parliamentary_groups_id_fk" FOREIGN KEY ("author_group_id") REFERENCES "public"."parliamentary_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_amendment_id_amendments_id_fk" FOREIGN KEY ("amendment_id") REFERENCES "public"."amendments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_amendment_id_unique" UNIQUE("amendment_id");--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_amendment_id_on_amendment_only" CHECK ("votes"."amendment_id" is null or "votes"."subject" = 'amendment');--> statement-breakpoint
CREATE POLICY "amendments_public_read_published" ON "amendments" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("amendments"."status" = 'published'
                 and exists (select 1 from texts where texts.id = "amendments"."text_id" and texts.status = 'published'));