-- ==============================================================================
-- SUPABASE PRODUCTION MIGRATION (FIREBASE AUTH + SESSION VARIABLE RLS)
-- Project: Self Reporting System
-- Architecture: Backend-authenticated gateway using transaction-scoped Firebase UID
-- ==============================================================================

-- 1. USERS TABLE
-- Maps authenticated user identity (Firebase Auth UID) to application profile
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER SETTINGS TABLE
-- Persists weeklyOffDays [5,6], workingDays, workDayStart, workDayEnd, and startDate (Start From Today)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. USER TEMPLATES TABLE
-- Persists recurring task templates across sessions, months, and deployments
CREATE TABLE IF NOT EXISTS public.user_templates (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  templates_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TASKS TABLE
-- Tasks, Calendar, Meetings, Follow-ups, and Recurring Instances
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  priority TEXT NOT NULL DEFAULT 'medium',
  type TEXT NOT NULL DEFAULT 'task',
  start_time TEXT,
  end_time TEXT,
  duration_minutes INTEGER DEFAULT 30,
  category TEXT,
  project TEXT,
  notes TEXT,
  recurrence_tag TEXT,
  template_id TEXT,
  actual_minutes INTEGER,
  completed_at TEXT,
  contact_name TEXT,
  next_follow_up_date TEXT,
  parent_task_id TEXT,
  meeting_with TEXT,
  location_or_link TEXT,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_tasks PRIMARY KEY (id, user_id)
);

-- 5. REPORTS TABLE
-- Weekly and Monthly Reflection Records
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  report_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_reports PRIMARY KEY (id, user_id)
);

-- 6. ACTIVITY LOGS TABLE
-- Security & Operational Audit Log
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_user_type ON public.reports(user_id, type);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_time ON public.activity_logs(timestamp DESC);

-- ==============================================================================
-- 8. SESSION CONTEXT & HELPER FUNCTIONS
-- ==============================================================================

-- Safely retrieves the verified Firebase UID set for the active transaction
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '');
$$;

-- Safely verifies whether the active context belongs to a Super Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = public.current_app_user_id()
      AND role = 'admin'
      AND status = 'active'
  );
$$;

-- Trigger to prevent regular users from elevating role or modifying status
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security Violation: Only Super Admins may alter user role or status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) ENFORCEMENT
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Enforce RLS rules strictly
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs FORCE ROW LEVEL SECURITY;

-- 10. USER POLICIES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_policy') THEN
    CREATE POLICY users_select_policy ON public.users
      FOR SELECT
      USING (id = public.current_app_user_id() OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_insert_policy') THEN
    CREATE POLICY users_insert_policy ON public.users
      FOR INSERT
      WITH CHECK (id = public.current_app_user_id() OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_policy') THEN
    CREATE POLICY users_update_policy ON public.users
      FOR UPDATE
      USING (id = public.current_app_user_id() OR public.is_admin())
      WITH CHECK (id = public.current_app_user_id() OR public.is_admin());
  END IF;
END $$;

-- 11. USER SETTINGS POLICIES (Strict User Isolation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'user_settings_isolation') THEN
    CREATE POLICY user_settings_isolation ON public.user_settings
      FOR ALL
      USING (user_id = public.current_app_user_id() OR public.is_admin())
      WITH CHECK (user_id = public.current_app_user_id() OR public.is_admin());
  END IF;
END $$;

-- 12. USER TEMPLATES POLICIES (Strict User Isolation)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_templates' AND policyname = 'user_templates_isolation') THEN
    CREATE POLICY user_templates_isolation ON public.user_templates
      FOR ALL
      USING (user_id = public.current_app_user_id() OR public.is_admin())
      WITH CHECK (user_id = public.current_app_user_id() OR public.is_admin());
  END IF;
END $$;

-- 13. TASKS POLICIES (Strict User Isolation: Read, Insert, Update, Delete)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_isolation') THEN
    CREATE POLICY tasks_isolation ON public.tasks
      FOR ALL
      USING (user_id = public.current_app_user_id() OR public.is_admin())
      WITH CHECK (user_id = public.current_app_user_id() OR public.is_admin());
  END IF;
END $$;

-- 14. REPORTS POLICIES (Strict User Isolation: Weekly & Monthly Reports)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'reports_isolation') THEN
    CREATE POLICY reports_isolation ON public.reports
      FOR ALL
      USING (user_id = public.current_app_user_id() OR public.is_admin())
      WITH CHECK (user_id = public.current_app_user_id() OR public.is_admin());
  END IF;
END $$;

-- 15. ACTIVITY LOGS POLICIES (Append-only for users, viewable by owner or admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_select') THEN
    CREATE POLICY activity_logs_select ON public.activity_logs
      FOR SELECT
      USING (user_id = public.current_app_user_id() OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_insert') THEN
    CREATE POLICY activity_logs_insert ON public.activity_logs
      FOR INSERT
      WITH CHECK (user_id = public.current_app_user_id() OR public.is_admin());
  END IF;
END $$;

-- ==============================================================================
-- 16. DIRECT POSTGREST API HARDENING
-- ==============================================================================
-- Since the application operates via the authenticated Express API backend,
-- revoke direct table access from public PostgREST roles (anon and authenticated)
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.user_settings FROM anon, authenticated;
REVOKE ALL ON public.user_templates FROM anon, authenticated;
REVOKE ALL ON public.tasks FROM anon, authenticated;
REVOKE ALL ON public.reports FROM anon, authenticated;
REVOKE ALL ON public.activity_logs FROM anon, authenticated;
