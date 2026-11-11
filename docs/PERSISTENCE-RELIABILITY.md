# Confiabilidade dos registros — Milk

## Correções

O histórico não deve ser substituído por um snapshot vazio ou antigo. A edição
com servidor agora usa um único caminho de escrita: fila persistente por família
no navegador → servidor → merge com comparação de versão no Supabase.

- Mamadas e fraldas recebem IDs aleatórios para evitar colisão entre aparelhos.
- Cada aba mantém seu envio pendente em uma chave própria. A confirmação de uma
  versão antiga não remove alterações feitas enquanto a requisição estava ativa.
- Fechar/reabrir o aplicativo recupera a fila. Reconexão, foco e verificação
  periódica tentam reenviar sem exigir uma nova edição.
- Login e renovação de sessão mesclam o cache atual da família. Trocar de conta
  recria o estado do aplicativo e invalida respostas antigas.
- Listas são unidas por ID; edições e exclusões explícitas respeitam a revisão
  mais recente. A ausência de um registro em um snapshot não significa exclusão.
- O servidor lê o registro e atualiza somente se `updated_at` ainda corresponder
  à versão lida. Em um conflito, relê e mescla os registros do outro escritor.
- HTTP 200 e `supabaseSynced: true` exigem confirmação do banco. Falhas retornam
  HTTP 503 e a interface mantém “Pendente”, sem descartar o envio.
- O arquivo local do servidor é substituído atomicamente. Arquivo corrompido ou
  ilegível é preservado; a inicialização falha em vez de recriar dados vazios.

## Validação reproduzível

```sh
npm run lint
npm run test:cloud
npm run build
VITE_SUPABASE_URL=https://example.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_only npm run build:pages
```

Os testes de `test:cloud` usam apenas dados fictícios. A integração HTTP inicia o
servidor real com um endpoint Supabase simulado localmente; cobre erro de permissão,
reenvio, confirmação, concorrência e preservação de arquivo corrompido.

O workflow `verify-milk-pages.yml` também executa
`tests/browser_persistence.py` em Chromium. O frontend Vite é iniciado sem o
backend e todas as APIs são interceptadas. Esse teste cobre mamadas, fraldas,
recarga, rede indisponível, confirmação falsa/atrasada e isolamento entre famílias.

## Publicação e limites da verificação

O workflow de implantação deste repositório publica o **GitHub Pages**. Ele não
publica o servidor Express no Google AI Studio/Cloud Run. A instalação com servidor
precisa executar esta revisão tanto no frontend quanto no backend. Versões antigas
que ainda fazem `upsert` completo não têm a proteção de concorrência desta revisão.

A edição Pages permanece em **modo consulta**, inclusive na camada de transporte.
Sua habilitação de escrita depende de verificação autenticada de Auth/RLS/RPC no
projeto Supabase **mamei**. Esta correção não concede permissões, não altera políticas
e não executa migrações no banco de produção.

O acesso administrativo disponível durante esta correção não incluía mamei.
Os testes com banco simulado comprovam o comportamento do código, mas não comprovam
as permissões, a disponibilidade ou o salvamento no banco real. Não se deve aplicar
SQL no projeto Cartório One para tentar corrigir o Milk.

O aplicativo consegue preservar e reenviar dados ainda presentes no cache ou na
fila do aparelho. Dados já apagados de todos os aparelhos e do banco exigem um
backup válido; esta correção não recria registros históricos ausentes.

## Diagnóstico de sincronização (11/11/2026)

O aviso `O servidor está sem confirmação do banco` é emitido após um GET de
`/api/family/:familyId/sync` quando `supabaseActive` não é `true`.
A leitura pode falhar por indisponibilidade, permissão/RLS, limite de chamadas,
ou ausência de uma linha visível (que também pode ser consequência de RLS).
**Isso não comprova exclusão de registros.**

- O backend retorna `supabaseIssue` e `errorCode` de um conjunto fechado, sem
  vazar SQL, tokens, dados privados ou nomes de famílias.
- A interface diferencia falha de leitura (`Sem banco`) de envio ainda não
  confirmado (`Pendente`). Uma consulta após falha de escrita não pode mascarar
  o erro de escrita nem liberar a fila de envio.
- `/api/supabase/status` não deve declarar conexão saudável quando a tabela
  obrigatória `milkflow_store` não está disponível.
- Um servidor sem os campos de confirmação da nova versão gera aviso explícito
  de backend desatualizado, em vez de um falso sucesso.

**Pendente de homologação em produção:** identificar a URL realmente usada no
aparelho, conferir a implantação correspondente do servidor Express e verificar
em *mamei* os logs de leitura/gravação, existência da linha e políticas RLS.
Não aplicar a migration de acesso público nem conectar o banco Cartório One.
Os testes automatizados usam somente dados fictícios, não comprovam a escrita
no Supabase de produção. É necessário backup verificado antes de qualquer
alteração de RLS ou migração.

## Incidente: `Invalid API key` (11/11/2026)

A auditoria do aplicativo confirmou HTTP de erro `Invalid API key` na REST API
do projeto **mamei**. Isso é um erro de chave API ou par URL/chave, **não prova**
que a política RLS bloqueou a família, que a tabela foi apagada ou que dados
foram perdidos. O código anterior usava uma chave `anon` JWT embutida quando
não encontrava a variável de ambiente; esse fallback foi removido.

### Recuperação sem perda de dados

1. **Antes de qualquer outra ação**, em cada aparelho com histórico local,
   exportar o backup JSON e guardar cópia privada. Não limpar dados do navegador,
   desinstalar o PWA, sair da conta ou executar o recurso de reparo automático
   sem um backup comparado.
2. Entrar no dashboard do **projeto correto mamei**, em *Settings > API Keys*,
   e copiar para o ambiente do servidor apenas a **publishable key** pública
   (prefixo `sb_publishable_`) ou a `anon` pública legada. Uma chave
   `sb_secret_`/service_role jamais deve entrar no browser, nesta aplicação
   sem autenticação Supabase verificada ou no repositório público.
3. Na **hospedagem que executa o servidor Express** (Google AI Studio/Cloud Run,
   se esta for a instalação em uso), definir `SUPABASE_URL` e
   `SUPABASE_PUBLISHABLE_KEY` com valores do **mesmo projeto**. Usar
   `SUPABASE_ANON_KEY` somente como alternativa legada. Publicar nova revisão
   do **frontend e backend**, ambos vindos do mesmo commit, após conferir
   as variáveis. A publicação GitHub Pages usa `MILK_SUPABASE_*` como variáveis
   próprias do GitHub Actions e **não** atualiza o Cloud Run.
4. Conferir `/api/supabase/status`, depois salvar um registro controlado e
   validar resposta da rota de gravação com `supabaseSynced: true` e
   confirmar leitura desse mesmo registro no banco. Comparar quantidade/IDs com
   o backup anterior e conferir nos dois aparelhos. A API de saúde só testa
   leitura da tabela: `connected: true` não comprova que a família pode gravar.
5. Caso, depois de corrigir a chave, apareça erro RLS, **não** ativar
   `FOR ALL TO anon USING(true)` nem ampliar o acesso entre famílias. Auditar
   o modelo de autenticação, isolamento e memberships e aplicar migração
   aprovada somente após backup e testes de permissões.

### Proteções implementadas

- Nenhuma chave JWT antiga é embutida no código como fallback.
- URL e chave pública explícitas são exigidas no servidor; chave secreta é
  recusada para impedir desativação involuntária da RLS.
- A API reporta `invalid_api_key`, `missing_configuration` ou RLS como
  falhas distintas, sem devolver tokens, SQL de erro ou registros.
- O botão da auditoria usa a fila local do aplicativo, não a rota legada,
  e só exibe sucesso após confirmação de gravação/leitura.
- `100% local` significa apenas consistência dos registros analisados, não
  cópia em nuvem.
- A API pública de alteração das credenciais foi desativada. O painel deixou
  de oferecer SQL permissivo que colocaria todas as famílias em risco.

**Limite de homologação:** o conector Supabase acessível no chat consultado
estava associado ao Cartório One, não ao projeto mamei. Os testes deste PR
são com dados sintéticos. Não alterar o Cartório One nem assumir que o backend
Cloud Run já foi atualizado após o merge.
