-- MilkFlow PHASE 1: Prepare owner-linked auth membership.
-- Run only in the mamei Supabase project, after confirming the project ID.
-- Does not edit, delete or overwrite milkflow_store. Safe before cutover.
BEGIN;

CREATE TABLE IF NOT EXISTS public.milkflow_family_members (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER','CAREGIVER')),
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, family_id)
);

CREATE INDEX IF NOT EXISTS milkflow_family_members_by_family
  ON public.milkflow_family_members(family_id);

ALTER TABLE public.milkflow_family_members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.milkflow_family_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.milkflow_family_members TO authenticated;

DROP POLICY IF EXISTS milkflow_family_self_select ON public.milkflow_family_members;
CREATE POLICY milkflow_family_self_select
  ON public.milkflow_family_members
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMIT;

-- BIND THE OWNER ONLY AFTER YOU HAVE VERIFIED BOTH:
-- 1) The signed-up Auth UID belongs to the intended adult;
-- 2) The family_data_<id> row exists and contains Iza's expected profile.
--
-- Replace the placeholders locally in the Supabase SQL Editor, NEVER COMMIT
-- the email, UID or family ID to the public repository. DO NOT blindly run.
--
-- BEGIN;
-- INSERT INTO public.milkflow_family_members(user_id, family_id, role, display_name)
-- SELECT id, '<VERIFIED_FAMILY_ID>', 'OWNER', '<DISPLAY_NAME>'
-- FROM auth.users
-- WHERE id = '<CONFIRMED_AUTH_UID>'::uuid
--   AND email_confirmed_at IS NOT NULL
--   AND EXISTS (
--     SELECT 1 FROM public.milkflow_store
--     WHERE key = 'family_data_' || '<VERIFIED_FAMILY_ID>'
--   )
-- ON CONFLICT (user_id, family_id) DO NOTHING;
-- COMMIT;
--
-- The other caregiver must be linked to the SAME family as CAREGIVER
-- only after verifying their own Auth UID. Never use the old 6-digit code.
