/**
 * Public, non-sensitive synchronization diagnostics.
 * Never expose Supabase error messages, tokens, SQL, or family identifiers.
 */
export type SyncIssueCode =
  | 'permission_denied'
  | 'rate_limited'
  | 'not_visible'
  | 'invalid_api_key'
  | 'missing_configuration'
  | 'unsafe_key_type'
  | 'missing_table'
  | 'unavailable'
  | 'outdated_server'
  | 'not_confirmed';

export function classifySupabaseFailure(error: unknown): SyncIssueCode {
  const fault: Record<string, unknown> = error && typeof error === 'object'
    ? error as Record<string, unknown> : {};
  const status = Number(fault.status ?? fault.statusCode ?? 0);
  const code = typeof fault.code === 'string' ? fault.code.toUpperCase() : '';
  const message = typeof fault.message === 'string' ? fault.message.toLowerCase() : '';
  // API gateway authentication errors take precedence over generic HTTP 401.
  // A rejected project key cannot be repaired by weakening RLS.
  if (
    code === 'MILK_PUBLIC_KEY_MISSING' || code === 'MILK_PROJECT_URL_MISSING'
  ) return 'missing_configuration';
  if (code === 'MILK_UNSAFE_KEY_TYPE') return 'unsafe_key_type';
  if (/invalid api key|invalid apikey|api key not found|api key is invalid/.test(message))
    return 'invalid_api_key';
  if (code === '42P01' || code === 'PGRST205') return 'missing_table';
  if (
    status === 401 || status === 403 ||
    code === '42501' || code === 'PGRST301' ||
    /permission denied|row.level.security|unauthorized|jwt expired/.test(message)
  ) return 'permission_denied';
  if (status === 429 || /too many requests|rate limit|rate.limit/.test(message)) return 'rate_limited';
  return 'unavailable';
}

/** A successful HTTP request alone never establishes that a write persisted. */
export function unconfirmedWriteMessage(reason: unknown): string {
  switch (reason) {
    case 'invalid_api_key':
      return 'Chave API inválida no Supabase. Configure uma chave publishable ou anon válida do projeto mamei no servidor. Os registros continuam neste aparelho.';
    case 'missing_configuration':
      return 'A chave pública do Supabase não está configurada no servidor. Os registros continuam guardados neste aparelho.';
    case 'unsafe_key_type':
      return 'O servidor recebeu uma chave secreta incompatível com esta integração. Configure uma chave publishable/anon; os registros continuam guardados.';
    case 'missing_table':
      return 'O Supabase não disponibilizou a tabela de registros. Nenhum dado local foi apagado; revise o banco com backup antes de alterar a estrutura.';
    case 'permission_denied':
      return 'O Supabase recusou a gravação (permissão/RLS). Os registros continuam guardados neste aparelho e serão reenviados após a correção do acesso.';
    case 'rate_limited':
      return 'O Supabase limitou as requisições. Os registros continuam guardados neste aparelho para uma nova tentativa.';
    case 'outdated_server':
      return 'O servidor do Milk não confirmou a gravação no banco. É necessário atualizar o backend para a mesma versão do aplicativo. Os registros locais foram preservados.';
    default:
      return 'O banco não confirmou o envio. Seus registros continuam guardados neste aparelho para uma nova tentativa.';
  }
}

/** No visible row is NOT proof the family's data was deleted: RLS can hide it. */
export function unconfirmedReadMessage(reason: unknown): string {
  switch (reason) {
    case 'invalid_api_key':
      return 'Chave API inválida no Supabase. Verifique a chave publishable/anon e a URL do mesmo projeto no servidor. O histórico local foi preservado.';
    case 'missing_configuration':
      return 'O servidor não tem a chave pública do Supabase configurada. O histórico local foi preservado.';
    case 'unsafe_key_type':
      return 'O servidor precisa de uma chave publishable/anon, não de uma chave secreta. O histórico local foi preservado.';
    case 'missing_table':
      return 'A tabela de registros não está disponível no Supabase. Não aplique SQL sem backup e auditoria. O histórico local foi preservado.';
    case 'permission_denied':
      return 'O Supabase recusou a consulta (permissão/RLS). O histórico local foi preservado; a configuração de acesso precisa ser verificada.';
    case 'rate_limited':
      return 'O Supabase limitou as consultas. O histórico local foi preservado; tente sincronizar mais tarde.';
    case 'not_visible':
      return 'O Supabase não retornou um registro visível desta família. Isso pode indicar falta de acesso ou um registro ausente. O histórico local foi preservado.';
    case 'outdated_server':
      return 'O servidor está em uma versão que não confirma as leituras no banco. Atualize o backend do Milk. O histórico local foi preservado.';
    default:
      return 'O servidor não conseguiu confirmar a leitura no Supabase. O histórico local foi preservado.';
  }
}
