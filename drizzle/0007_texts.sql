CREATE TYPE "public"."text_nature" AS ENUM('government_bill', 'member_bill');--> statement-breakpoint
CREATE TABLE "text_subtopics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_id" uuid NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "text_subtopics_text_id_subtopic_id_unique" UNIQUE("text_id","subtopic_id")
);
--> statement-breakpoint
ALTER TABLE "text_subtopics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legislature_id" uuid NOT NULL,
	"nature" text_nature NOT NULL,
	"number" integer NOT NULL,
	"official_title" text NOT NULL,
	"filed_on" date NOT NULL,
	"official_url" text,
	"summary" text NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "texts_legislature_id_number_unique" UNIQUE("legislature_id","number")
);
--> statement-breakpoint
ALTER TABLE "texts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "text_subtopics" ADD CONSTRAINT "text_subtopics_text_id_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_subtopics" ADD CONSTRAINT "text_subtopics_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texts" ADD CONSTRAINT "texts_legislature_id_legislatures_id_fk" FOREIGN KEY ("legislature_id") REFERENCES "public"."legislatures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "text_subtopics_public_read_published" ON "text_subtopics" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from texts where texts.id = "text_subtopics"."text_id" and texts.status = 'published'));--> statement-breakpoint
CREATE POLICY "texts_public_read_published" ON "texts" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("texts"."status" = 'published');