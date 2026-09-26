-- The audit log is append-only. UPDATE and DELETE are rejected unless the
-- retention job opts in for its own transaction with:
--   SET LOCAL app.audit_prune = 'on';
CREATE OR REPLACE FUNCTION audit_log_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.audit_prune', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AdminAuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AdminAuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_guard();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AdminAuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_guard();
