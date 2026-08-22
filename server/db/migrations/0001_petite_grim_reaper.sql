CREATE TYPE "public"."rating_label" AS ENUM('AWESOME', 'GOOD', 'SUCKS');--> statement-breakpoint
CREATE TABLE "rating" (
	"user_id" text NOT NULL,
	"kind" "kind" NOT NULL,
	"tmdb_id" integer NOT NULL,
	"label" "rating_label" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_user_id_kind_tmdb_id_pk" PRIMARY KEY("user_id","kind","tmdb_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;