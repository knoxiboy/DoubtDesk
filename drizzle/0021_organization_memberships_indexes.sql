-- Indexes for organization_memberships (issue #1343).
-- Support efficient lookups by organization and by user email.
-- Idempotent so it is safe to re-run via the manual migrate runner.
CREATE INDEX IF NOT EXISTS "organization_memberships_organization_id_idx" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_memberships_user_email_idx" ON "organization_memberships" USING btree ("user_email");