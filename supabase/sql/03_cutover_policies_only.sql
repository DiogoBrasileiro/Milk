-- CUTOVER: only after signed-in read verification, complete backup and approval.
-- This removes anonymous access; the old Google app may stop synchronizing.
-- Run on the mamei project only, never Cartorio One.
BEGIN;
DO $guard$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.milkflow_family_members m
   JOIN public.milkflow_store s ON s.key='family_data_'||m.family_id
   WHERE m.role='OWNER'
 ) THEN RAISE EXCEPTION 'Verified owner membership not found'; END IF;
 IF to_regclass('milkflow_backup.snapshot_20261017') IS NULL THEN
   RAISE EXCEPTION 'Verified backup snapshot missing'; END IF;
END $guard$;
-- Read/write access is now only for logged-in members. No anon access.
ALTER TABLE public.milkflow_store ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.milkflow_store FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.milkflow_store TO authenticated;

-- Existing broad policies cannot safely coexist with member-specific access.
DO $policies$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'milkflow_store'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.milkflow_store',policy_record.policyname);
  END LOOP;
END $policies$;

CREATE POLICY milkflow_store_member_select
ON public.milkflow_store
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.milkflow_family_members m
    WHERE m.user_id = (SELECT auth.uid())
      AND public.milkflow_store.key = 'family_data_' || m.family_id
  )
);

CREATE POLICY milkflow_store_member_update
ON public.milkflow_store
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.milkflow_family_members m
    WHERE m.user_id = (SELECT auth.uid())
      AND public.milkflow_store.key = 'family_data_' || m.family_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.milkflow_family_members m
    WHERE m.user_id = (SELECT auth.uid())
      AND public.milkflow_store.key = 'family_data_' || m.family_id
  )
);


-- Grant RPC only after isolated read/write tests. No RPC grant in this script.
COMMIT;
SELECT tablename, policyname, roles, cmd
FROM pg_policies WHERE schemaname='public'
AND tablename IN ('milkflow_store','milkflow_family_members');
