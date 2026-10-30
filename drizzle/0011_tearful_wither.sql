CREATE TABLE "leetcode_days" (
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"submissions" integer NOT NULL,
	CONSTRAINT "leetcode_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "leetcode_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"real_name" text,
	"avatar_url" text,
	"ranking" integer,
	"reputation" integer,
	"star_rating" double precision,
	"solved_total" integer DEFAULT 0 NOT NULL,
	"solved_easy" integer DEFAULT 0 NOT NULL,
	"solved_medium" integer DEFAULT 0 NOT NULL,
	"solved_hard" integer DEFAULT 0 NOT NULL,
	"submissions_total" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"active_days" integer DEFAULT 0 NOT NULL,
	"contest_rating" double precision,
	"contests_attended" integer,
	"contest_global_ranking" integer,
	"contest_top_pct" double precision,
	"connected_at" bigint NOT NULL,
	"synced_at" bigint,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "leetcode_submissions" (
	"user_id" integer NOT NULL,
	"id" text NOT NULL,
	"title" text NOT NULL,
	"title_slug" text NOT NULL,
	"lang" text,
	"submitted_at" bigint NOT NULL,
	CONSTRAINT "leetcode_submissions_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "leetcode_days" ADD CONSTRAINT "leetcode_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leetcode_profiles" ADD CONSTRAINT "leetcode_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leetcode_submissions" ADD CONSTRAINT "leetcode_submissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leetcode_submissions_recent" ON "leetcode_submissions" USING btree ("user_id","submitted_at");