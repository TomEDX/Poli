CREATE TABLE "extract_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extract_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extract_sources_extract_id_source_id_unique" UNIQUE("extract_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "extract_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "extracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidacy_id" uuid NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"quote" text NOT NULL,
	"recorded_on" date NOT NULL,
	"position" integer NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extracts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "extract_sources" ADD CONSTRAINT "extract_sources_extract_id_extracts_id_fk" FOREIGN KEY ("extract_id") REFERENCES "public"."extracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extract_sources" ADD CONSTRAINT "extract_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracts" ADD CONSTRAINT "extracts_candidacy_id_candidacies_id_fk" FOREIGN KEY ("candidacy_id") REFERENCES "public"."candidacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracts" ADD CONSTRAINT "extracts_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "candidacies_public_read_published" ON "candidacies" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("candidacies"."status" = 'published');--> statement-breakpoint
CREATE POLICY "extract_sources_public_read_published" ON "extract_sources" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from extracts join candidacies on candidacies.id = extracts.candidacy_id
                         where extracts.id = "extract_sources"."extract_id" and extracts.status = 'published'
                           and candidacies.status = 'published'));--> statement-breakpoint
CREATE POLICY "extracts_public_read_published" ON "extracts" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("extracts"."status" = 'published'
                 and exists (select 1 from candidacies
                             where candidacies.id = "extracts"."candidacy_id" and candidacies.status = 'published'));