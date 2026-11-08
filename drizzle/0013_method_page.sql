CREATE TABLE "method_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "publication_status" NOT NULL,
	"candidacy_criteria" text NOT NULL,
	"text_criteria" text NOT NULL,
	"score_formula" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "method_pages_status_unique" UNIQUE("status")
);
--> statement-breakpoint
ALTER TABLE "method_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "method_pages_public_read_published" ON "method_pages" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("method_pages"."status" = 'published');