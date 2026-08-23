CREATE TYPE "public"."watch_status" AS ENUM('WATCHLISTED', 'WATCHED');--> statement-breakpoint
CREATE TABLE "title_status" (
	"user_id" text NOT NULL,
	"kind" "kind" NOT NULL,
	"tmdb_id" integer NOT NULL,
	"status" "watch_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "title_status_user_id_kind_tmdb_id_pk" PRIMARY KEY("user_id","kind","tmdb_id")
);
--> statement-breakpoint
ALTER TABLE "title_status" ADD CONSTRAINT "title_status_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;