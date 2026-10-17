# MILKFLOW — Handoff para Codex (Supabase já aberto no Safari)

**Escopo estrito:** GitHub `DiogoBrasileiro/Milk`; Supabase projeto **mamei**.
Nunca alterar GitHub, Supabase, credenciais ou ambiente do Cartório One.

## Situação inicial

- O Google AI Studio atualmente guarda registros reais no Supabase `milkflow_store`.
- O projeto Supabase tem três linhas familiares, e foi confirmado um histórico de Iza no registro original.
- O Supabase Auth estava sem usuários na captura enviada.
- O repositório é **público**; não comitar email, ID familiar real, backup JSON, JWT, senha, `service_role` ou `sb_secret_`.
- O backup `backup_iza_2026-10-16.json` existe fora do repositório e não deve ir para GitHub.
- Esta branch prepara uma edição cloud; **não fazer merge na main** antes dos testes e da configuração.

## Autorização do Codex

O Codex local não deve presumir controle da aba Safari. Use Supabase CLI autenticado
na conta `mamei Org` ou navegação autorizada em Work/Computer Use, se disponível.
Se não puder controlar a aba, peça ao operador que **cole as queries SQL no SQL Editor**;
não use a conexão Supabase deste chat ligada ao Cartório One.

## Ordem de execução — com checkpoints

1. Identificar o projeto ativo no painel: projeto `mamei`, ref comprovado anteriormente.
   Executar **somente leitura**: `supabase/sql/00_inspect_readonly.sql`.
   Confirmar política RLS existente e registros; não expor dados pessoais em logs.
2. Fazer snapshot completo de **todos os três registros familiares** antes de mexer em
   políticas; salvar em área privada e comparar com o backup do aplicativo.
3. Executar `supabase/sql/01_prepare_family_auth.sql`. Isso cria somente a tabela
   de associações, sem editar os dados existentes.
4. Em **Authentication > Users**, criar/invitar o adulto principal pela interface
   do Supabase ou cadastrar pelo aplicativo após preview autorizado. Verificar
   e-mail e `auth.users.id`. Não criar automaticamente nova família.
5. No SQL Editor, executar **apenas** o bloco `INSERT` comentado em 01 após
   conferir manualmente UID, ID familiar real e perfil da Iza. Permitir
   `OWNER` a somente um adulto conferido. Segundo cuidador: vínculo
   separado com seu UID e função `CAREGIVER`.
6. Agendar a troca para a edição GitHub. Executar `supabase/sql/02_cutover_rls_and_sync.sql`
   **somente após aprovação**. Este script substitui a política anterior e a
   versão antiga no Google AI Studio pode perder escrita anônima. Exige teste
   de leitura e gravação AUTENTICADAS, bloqueio de visitante e de família
   diferente; fazer rollback por políticas se algum teste falhar.
7. No GitHub, em `DiogoBrasileiro/Milk → Settings → Secrets and variables → Actions → Variables`
   definir **apenas dados públicos**:
   - `MILK_SUPABASE_URL` = URL pública do projeto mamei.
   - `MILK_SUPABASE_PUBLISHABLE_KEY` = chave **publishable** do mesmo projeto.
   NÃO adicionar `service_role` ou `sb_secret_` ao frontend.
8. Testar a branch (typecheck + build Cloud no GitHub Actions). Depois de
   confirmar RLS, Auth e RPC, aprovar e mesclar o PR. No Pages, usar
   `https://diogobrasileiro.github.io/Milk/`.
9. Homologar nos dois aparelhos: login, primeira carga dos dados da Iza,
   última mamada, ordenha, fraldas, estoque, medicamento, peso e
   sincronização de alterações concorrentes. Comparar contagens e IDs com
   snapshot do banco e backup JSON. Testar isolamento com usuário sem
   vínculo e anon; testar restauração após logout.
10. Só depois de 48 h de estabilidade e outro backup, avaliar
    desativar a publicação Google. **Não excluir o Supabase nem seus dados.**

## Integração preparada no GitHub

- `CloudAuthProvider` consulta a sessão Supabase e tabela protegida de
  membros; **não autentica por código familiar de seis dígitos**.
- `CloudAuthScreen` apresenta UID quando falta vínculo, evitando
  tentativa automática de acessar a família errada.
- `supabaseClient` exige URL e chave pública em tempo de compilação e
  chama a RPC de merge protegido.
- `AppContext` restringe cache por família, usa leitura autorizada,
  RPC e Realtime/poll 30 segundos como redundância.
- O build Cloud deve falhar se faltar configuração de produção.

## Gate de publicação

Não mesclar o PR antes de os testes de Auth/RLS/RPC passarem no projeto
mamei. NÃO executar migrations sobre o Cartório One.

## Segurança residual

Um snapshot familiar e código antigo foram removidos do HEAD do repositório
público, mas **persistem no histórico Git**. Rotacionar códigos antigos,
rever credenciais e, após backup, planejar a limpeza do histórico em
procedimento separado e explícito. Nenhum registro ou credencial deve
ser copiado para comentários, Actions logs ou pull requests.
