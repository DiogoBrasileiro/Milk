-- PREPARATION ONLY: no changes to family records, policies or table grants.
-- Run in mamei after verifying the 3-row backup. Creates inactive RPCs.
-- Do NOT call the merge RPC in production until merge semantics are audited.
BEGIN;
DO $check$
BEGIN
 IF to_regclass('public.milkflow_store') IS NULL OR
    to_regclass('public.milkflow_family_members') IS NULL THEN
  RAISE EXCEPTION 'Wrong project or missing tables';
 END IF;
END $check$;
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
  FROM PUBLIC, anon, authenticated;
-- Execution stays disabled until authenticated write tests and cutover.

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
-- Execution stays disabled until authenticated write tests and cutover.

COMMIT;
SELECT proname, has_function_privilege('anon',oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',oid,'EXECUTE') AS authenticated_execute
FROM pg_proc
WHERE pronamespace='public'::regnamespace
AND proname IN ('milkflow_merge_items','milkflow_merge_snapshot');
