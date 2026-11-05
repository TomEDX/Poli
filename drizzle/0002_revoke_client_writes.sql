-- Supabase grants every privilege on public tables to its API roles. Row level
-- security does not cover TRUNCATE, so writes are revoked outright: only the app,
-- connected as postgres after checking the editor, writes to the database.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
