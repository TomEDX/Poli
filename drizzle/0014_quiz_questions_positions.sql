CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"candidacy_id" uuid NOT NULL,
	"value" smallint,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_question_id_candidacy_id_unique" UNIQUE("question_id","candidacy_id"),
	CONSTRAINT "positions_value_on_the_scale" CHECK ("positions"."value" between -2 and 2)
);
--> statement-breakpoint
ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"position" integer NOT NULL,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_candidacy_id_candidacies_id_fk" FOREIGN KEY ("candidacy_id") REFERENCES "public"."candidacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "positions_public_read_published" ON "positions" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from questions where questions.id = "positions"."question_id" and questions.status = 'published')
                 and exists (select 1 from candidacies
                             where candidacies.id = "positions"."candidacy_id" and candidacies.status = 'published'));--> statement-breakpoint
CREATE POLICY "questions_public_read_published" ON "questions" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("questions"."status" = 'published');