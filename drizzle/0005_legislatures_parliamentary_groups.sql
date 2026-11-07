CREATE TABLE "legislatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"started_on" date NOT NULL,
	"ended_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legislatures_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "legislatures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parliamentary_group_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parliamentary_group_parties_group_id_party_id_unique" UNIQUE("group_id","party_id")
);
--> statement-breakpoint
ALTER TABLE "parliamentary_group_parties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parliamentary_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legislature_id" uuid NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parliamentary_groups_legislature_id_name_unique" UNIQUE("legislature_id","name"),
	CONSTRAINT "parliamentary_groups_legislature_id_abbreviation_unique" UNIQUE("legislature_id","abbreviation")
);
--> statement-breakpoint
ALTER TABLE "parliamentary_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parliamentary_group_parties" ADD CONSTRAINT "parliamentary_group_parties_group_id_parliamentary_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."parliamentary_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parliamentary_group_parties" ADD CONSTRAINT "parliamentary_group_parties_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parliamentary_groups" ADD CONSTRAINT "parliamentary_groups_legislature_id_legislatures_id_fk" FOREIGN KEY ("legislature_id") REFERENCES "public"."legislatures"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- The only legislature, managed without a screen (ADR 0005): the 17th, opened on 18 July 2024.
INSERT INTO "legislatures" ("number", "started_on") VALUES (17, '2024-07-18');
