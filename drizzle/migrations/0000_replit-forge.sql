CREATE TABLE "ai_requests" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forge_projects" (
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"name" text DEFAULT 'Untitled project' NOT NULL,
	"stage" text DEFAULT '' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forge_projects_user_id_project_id_pk" PRIMARY KEY("user_id","project_id"),
	CONSTRAINT "forge_projects_id_len" CHECK (char_length("forge_projects"."project_id") between 1 and 120),
	CONSTRAINT "forge_projects_size" CHECK (pg_column_size("forge_projects"."data") < 8000000)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"tier" text NOT NULL,
	"prompt" text NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"progress_message" text,
	"stripe_session_id" text,
	"project_name" text,
	"file_count" integer,
	"error" text,
	"license_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"archive" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_tier_check" CHECK ("purchases"."tier" in ('standard', 'pro')),
	CONSTRAINT "purchases_amount_check" CHECK ("purchases"."amount_cents" >= 0),
	CONSTRAINT "purchases_progress_check" CHECK ("purchases"."progress" between 0 and 100),
	CONSTRAINT "purchases_status_check" CHECK ("purchases"."status" in ('pending', 'queued', 'processing', 'ready', 'failed', 'cancelled')),
	CONSTRAINT "purchases_type_check" CHECK ("purchases"."type" in ('website', 'restaurant', 'services', 'saas', 'social', 'spreadsheet', 'software'))
);
--> statement-breakpoint
CREATE INDEX "ai_requests_user_time_idx" ON "ai_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "forge_projects_user_updated_idx" ON "forge_projects" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_stripe_session_idx" ON "purchases" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "purchases_user_created_idx" ON "purchases" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");