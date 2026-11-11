/**
 * Public, non-sensitive synchronization diagnostics.
 * Never expose Supabase error messages, tokens, SQL, or family identifiers.
 */
export type SyncIssueCode =
  | 'permission_denied'
  | 'rate_limited'
  | 'not_visible'
  | 'unavailable'
  | 'outdated_server'
  | 'not_confirmed';

export function classifySupabaseFailure(error: unknown): SyncIssueCode {
  const fault = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const status = Number(fault.status ?? fault.statusCode ?? 0);
  const code = typeof fault.code === 'string' ? fault.code.toUpperCase() : '';
  const message = typeof fault.message === 'string' ? fault.message.toLowerCase() : '';
  if (
    status === 401 || status === 403 ||
    code === '42501' || code === 'PGRST301' ||
    /permission denied|row.level.security|unauthorized|invalid api key|jwt expired/.test(message)
  ) return 'permission_denied';
  if (status === 429 || /too many requests|rate limit|rate.limit/.test(message)) return 'rate_limited';
  return 'unavailable';
}

/** A successful HTTP request alone never establishes that a write persisted. */
export function unconfirmedWriteMessage(reason: unknown): string {
  switch (reason) {
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
