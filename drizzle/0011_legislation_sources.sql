CREATE TABLE "amendment_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amendment_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amendment_sources_amendment_id_source_id_unique" UNIQUE("amendment_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "amendment_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "text_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "text_sources_text_id_source_id_unique" UNIQUE("text_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "text_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vote_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vote_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vote_sources_vote_id_source_id_unique" UNIQUE("vote_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "vote_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "amendment_sources" ADD CONSTRAINT "amendment_sources_amendment_id_amendments_id_fk" FOREIGN KEY ("amendment_id") REFERENCES "public"."amendments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "amendment_sources" ADD CONSTRAINT "amendment_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_sources" ADD CONSTRAINT "text_sources_text_id_texts_id_fk" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_sources" ADD CONSTRAINT "text_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_sources" ADD CONSTRAINT "vote_sources_vote_id_votes_id_fk" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_sources" ADD CONSTRAINT "vote_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "amendment_sources_public_read_published" ON "amendment_sources" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from amendments join texts on texts.id = amendments.text_id
                         where amendments.id = "amendment_sources"."amendment_id"
                           and amendments.status = 'published' and texts.status = 'published'));--> statement-breakpoint
CREATE POLICY "text_sources_public_read_published" ON "text_sources" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from texts where texts.id = "text_sources"."text_id" and texts.status = 'published'));--> statement-breakpoint
CREATE POLICY "vote_sources_public_read_published" ON "vote_sources" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from votes join texts on texts.id = votes.text_id
                         left join amendments on amendments.id = votes.amendment_id
                         where votes.id = "vote_sources"."vote_id" and texts.status = 'published'
                           and (votes.amendment_id is null or amendments.status = 'published')));