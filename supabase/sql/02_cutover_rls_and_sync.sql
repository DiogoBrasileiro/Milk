-- MilkFlow PHASE 2 (CUTOVER): Secure data access and atomic merge RPC.
-- DO NOT RUN until the old Google app's live data has been backed up,
-- users' identities are verified and family memberships are installed.
-- This replaces legacy RLS policies and can stop old anonymous writes.
-- Do not run it on Cartorio One or any other project.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.milkflow_store') IS NULL THEN
    RAISE EXCEPTION 'milkflow_store missing; wrong Supabase project';
  END IF;
  IF to_regclass('public.milkflow_family_members') IS NULL THEN
    RAISE EXCEPTION 'Run phase 1 first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.milkflow_family_members m
    JOIN public.milkflow_store s ON s.key = 'family_data_' || m.family_id
    WHERE m.role = 'OWNER'
  ) THEN
    RAISE EXCEPTION 'No verified family OWNER membership exists; no changes applied';
  END IF;
END $guard$;

-- Retain private, read-only rollback snapshots before touching RLS.
CREATE SCHEMA IF NOT EXISTS milkflow_private;
REVOKE ALL ON SCHEMA milkflow_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS milkflow_private.cutover_backup AS
SELECT key, value, updated_at, clock_timestamp() AS captured_at
FROM public.milkflow_store;

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

-- Merge list entries by stable ID and modification time. A higher version
-- is never replaced by an older version from a second phone.
CREATE OR REPLACE FUNCTION public.milkflow_merge_items(
  p_old jsonb, p_new jsonb, p_deleted jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH entries AS (
    SELECT old_entries.item AS item, 0 AS source
    FROM pg_catalog.jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_old) = 'array' THEN p_old ELSE '[]'::jsonb END
    ) AS old_entries(item)
    UNION ALL
    SELECT new_entries.item AS item, 1 AS source
    FROM pg_catalog.jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_new) = 'array' THEN p_new ELSE '[]'::jsonb END
    ) AS new_entries(item)
  ), latest AS (
    SELECT DISTINCT ON (item->>'id') item, item->>'id' AS item_id
    FROM entries
    WHERE jsonb_typeof(item) = 'object' AND item ? 'id'
    ORDER BY item->>'id',
      COALESCE(item->>'updatedAt',item->>'createdAt',item->>'timestamp',
               item->>'administeredAt',item->>'dateTime',item->>'startTime','') DESC,
      source DESC
  )
  SELECT COALESCE(jsonb_agg(item ORDER BY COALESCE(item->>'timestamp',
           item->>'createdAt',item->>'administeredAt','') DESC), '[]'::jsonb)
  FROM latest
  WHERE NOT (
    COALESCE(p_deleted,'{}'::jsonb) ? item_id
    AND COALESCE(item->>'updatedAt',item->>'createdAt',item->>'timestamp','')
        <= COALESCE(p_deleted->>item_id,'')
  );
$$;

REVOKE ALL ON FUNCTION public.milkflow_merge_items(jsonb,jsonb,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.milkflow_merge_items(jsonb,jsonb,jsonb)
  TO authenticated;

-- Atomic read-modify-write. SECURITY INVOKER preserves membership RLS.
-- The legacy data/family/babies envelope is preserved; unrelated rows are
-- never inserted, deleted or updated.
CREATE OR REPLACE FUNCTION public.milkflow_merge_snapshot(
  p_family_id text,
  p_snapshot jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_original jsonb;
  v_old_data jsonb;
  v_new_data jsonb;
  v_merged jsonb;
  v_result jsonb;
  v_deleted jsonb;
  v_key text;
  v_array_key text;
  v_array_keys text[] := ARRAY[
    'batches','transactions','feedings','pumpings','diapers',
    'discomforts','weights','sleepLogs','medications','medicationLogs',
    'diaperStockItems','diaperStockTransactions','diaperShoppingItems',
    'feedingPhases','auditLogs','caregivers'
  ];
BEGIN
  IF (SELECT auth.uid()) IS NULL OR
     NOT EXISTS (
       SELECT 1 FROM public.milkflow_family_members m
       WHERE m.user_id = (SELECT auth.uid()) AND m.family_id = p_family_id
     ) THEN
    RAISE EXCEPTION 'Family membership required' USING ERRCODE = '42501';
  END IF;
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'Expected a JSON object' USING ERRCODE = '22023';
  END IF;

  v_key := 'family_data_' || p_family_id;
  SELECT value INTO v_original
  FROM public.milkflow_store
  WHERE key = v_key
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original family record not found; no new family created'
      USING ERRCODE = 'P0002';
  END IF;

  v_old_data := COALESCE(v_original->'data',v_original->'familyData',v_original);
  v_new_data := COALESCE(p_snapshot->'data',p_snapshot);
  IF jsonb_typeof(v_old_data) <> 'object' OR jsonb_typeof(v_new_data) <> 'object' THEN
    RAISE EXCEPTION 'Unexpected snapshot schema' USING ERRCODE = '22023';
  END IF;

  v_merged := v_old_data || v_new_data;
  v_deleted := COALESCE(v_old_data->'deletedItemIds','{}'::jsonb)
            || COALESCE(v_new_data->'deletedItemIds','{}'::jsonb);
  v_merged := jsonb_set(v_merged,'{deletedItemIds}',v_deleted,true);

  FOREACH v_array_key IN ARRAY v_array_keys LOOP
    -- Refuse ambiguous historical items instead of silently discarding them.
    -- Never normalize or invent IDs during a live, destructive cutover.
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements(
        CASE WHEN jsonb_typeof(v_old_data->v_array_key) = 'array'
          THEN v_old_data->v_array_key ELSE '[]'::jsonb END
      ) AS original_item(item)
      WHERE jsonb_typeof(original_item.item) <> 'object'
        OR NOT (original_item.item ? 'id')
    ) THEN
      RAISE EXCEPTION 'Legacy entries without IDs in %, merge blocked', v_array_key
        USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements(
        CASE WHEN jsonb_typeof(v_new_data->v_array_key) = 'array'
          THEN v_new_data->v_array_key ELSE '[]'::jsonb END
      ) AS incoming_item(item)
      WHERE jsonb_typeof(incoming_item.item) <> 'object'
        OR NOT (incoming_item.item ? 'id')
    ) THEN
      RAISE EXCEPTION 'Incoming entries without IDs in %, merge blocked', v_array_key
        USING ERRCODE = '22023';
    END IF;
    IF v_old_data ? v_array_key OR v_new_data ? v_array_key THEN
      v_merged := jsonb_set(
        v_merged,
        ARRAY[v_array_key],
        public.milkflow_merge_items(
          v_old_data->v_array_key,
          v_new_data->v_array_key,
          v_deleted
        ),
        true
      );
    END IF;
  END LOOP;

  -- Keep newer baby profile revisions, not a stale second-phone snapshot.
  IF v_old_data ? 'baby' AND v_new_data ? 'baby'
    AND COALESCE(v_old_data->'baby'->>'updatedAt','')
      > COALESCE(v_new_data->'baby'->>'updatedAt','') THEN
    v_merged := jsonb_set(v_merged,'{baby}',v_old_data->'baby',true);
  END IF;

  IF v_original ? 'data' THEN
    v_result := jsonb_set(v_original,'{data}',v_merged,true);
  ELSIF v_original ? 'familyData' THEN
    v_result := jsonb_set(v_original,'{familyData}',v_merged,true);
  ELSE
    v_result := v_merged;
  END IF;

  IF jsonb_typeof(v_result->'babies') = 'array' AND v_merged ? 'baby' THEN
    v_result := jsonb_set(v_result,'{babies}',
      public.milkflow_merge_items(v_result->'babies',jsonb_build_array(v_merged->'baby'),'{}'::jsonb),true);
  END IF;

  UPDATE public.milkflow_store
  SET value = v_result, updated_at = clock_timestamp()
  WHERE key = v_key;

  RETURN jsonb_build_object('ok',true,'key',v_key);
END;
$$;

REVOKE ALL ON FUNCTION public.milkflow_merge_snapshot(text,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.milkflow_merge_snapshot(text,jsonb)
  TO authenticated;

COMMIT;

-- Verify policies and row counts without retrieving personal payloads:
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname='public'
AND tablename IN ('milkflow_store','milkflow_family_members');
SELECT count(*) AS rows_after_cutover FROM public.milkflow_store;
-- IMPORTANT: No service_role key in the frontend. Complete authenticated
-- read, write, denial and concurrency tests before enabling Pages cloud mode.
