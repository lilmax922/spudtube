-- Enable Row Level Security on every table so the PostgREST / anon-key path is locked
-- down by default. The app reaches the DB only through Hyperdrive as the database owner
-- role (postgres.zcdmemuuvecdqiaupxsv), which has BYPASSRLS, so enabling RLS does not
-- change any application read/write behaviour. No policies are granted here: nothing uses
-- the anon/authenticated roles, and granting none keeps that surface fully closed.
--> statement-breakpoint
ALTER TABLE "public"."rating" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."title_status" ENABLE ROW LEVEL SECURITY;
