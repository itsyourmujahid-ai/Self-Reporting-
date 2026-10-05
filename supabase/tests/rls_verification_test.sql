-- ==============================================================================
-- RLS SECURITY VERIFICATION TEST SUITE (NON-DESTRUCTIVE)
-- Can be executed in a transactional block to test policies without altering data
-- ==============================================================================

BEGIN;

-- 1. Create simulated test users in a transaction (will be rolled back)
INSERT INTO public.users (id, email, display_name, role, status)
VALUES 
  ('user_a_test', 'usera@example.com', 'User A', 'user', 'active'),
  ('user_b_test', 'userb@example.com', 'User B', 'user', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert test task for User B
INSERT INTO public.tasks (id, user_id, title, date, status, priority, type)
VALUES ('task_b_test', 'user_b_test', 'User B Secret Plan', '2026-10-04', 'planned', 'high', 'task')
ON CONFLICT (id, user_id) DO NOTHING;

-- 3. TEST: Set active identity to User A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "user_a_test", "role": "authenticated"}';

-- 3a. Test User A reading User B's tasks (Expected: 0 rows returned)
SELECT count(*) AS user_a_seeing_user_b_tasks FROM public.tasks WHERE user_id = 'user_b_test';

-- 3b. Test User A attempting to delete User B's task (Expected: 0 rows deleted)
DELETE FROM public.tasks WHERE id = 'task_b_test' AND user_id = 'user_b_test';

-- 3c. Test User A attempting to insert with User B's ID (Expected: Policy violation error if attempted)
-- (Handled by WITH CHECK (auth.uid()::text = user_id))

-- 4. TEST: Anonymous role access (Expected: Permission denied or 0 rows)
SET LOCAL ROLE anon;
RESET "request.jwt.claims";

SELECT count(*) AS anon_reading_tasks FROM public.tasks;

-- Rollback the transaction to ensure zero permanent data changes
ROLLBACK;
