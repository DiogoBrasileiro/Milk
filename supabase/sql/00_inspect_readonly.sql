-- MilkFlow: READ-ONLY inventory. Run in the mamei project SQL Editor.
-- Never paste passwords, JWTs, service_role secrets or family records into ChatGPT.
SELECT current_database() AS database_name,
       to_regclass('public.milkflow_store') AS store_table,
       to_regclass('public.milkflow_family_members') AS memberships_table;

SELECT key, updated_at, jsonb_typeof(value) AS value_kind,
       value ? 'data' AS has_data_envelope,
       value ? 'family' AS has_family_envelope,
       value ? 'babies' AS has_babies_envelope
FROM public.milkflow_store
ORDER BY updated_at DESC;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('milkflow_store','milkflow_family_members')
ORDER BY tablename, policyname;

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'milkflow_store'
ORDER BY grantee, privilege_type;

SELECT count(*) AS registered_users FROM auth.users;
