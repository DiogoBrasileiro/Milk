# MilkFlow — GitHub Pages + Supabase

URL: https://diogobrasileiro.github.io/Milk/

## Produção

O GitHub Pages só hospeda a interface. O histórico familiar é mantido no
Supabase **mamei**, acessado por Supabase Auth e Row Level Security (RLS).
Não é necessário hospedar um backend Express no Google Cloud Run.

O workflow usa duas variáveis de repositório (Settings > Secrets and variables
> Actions > Variables):

- `MILK_SUPABASE_URL` — URL pública do projeto.
- `MILK_SUPABASE_PUBLISHABLE_KEY` — chave **publishable** pública, nunca service_role ou secret.

O build de produção é bloqueado se qualquer configuração estiver ausente.
Na branch de PR os testes usam dados fictícios e **não** se conectam ao
banco de produção.

## Antes de ativar a versão Cloud

Siga `docs/MILK-CODEX-SUPABASE-HANDOFF.md` por ordem:
diagnóstico read-only, backup, criação de memberships,
verificação de identidade, políticas RLS + RPC,
testes, variáveis Actions e só depois merge na `main`.

A migração **não cria outra família** nem substitui registros existentes.
O histórico permanece na linha original verificada.

## Funcionalidades durante a migração

A `main` permanece na edição local já publicada até a configuração da
autenticação e a homologação do banco. O PR acrescenta a edição Cloud,
que sincroniza apenas contas vinculadas à mesma família. Login por
código numérico antigo foi desabilitado.

## Segurança

O repo é público: nunca adicionar arquivos de backup familiar, tokens, emails,
senhas ou chaves secretas ao Git. Há dados antigos removidos do HEAD mas ainda
presentes no histórico; planejar limpeza e rotação de acessos em etapa separada.
Não modificar o Cartório One.

## Diagnóstico de acesso ao endereço

Se a publicação em Actions passou mas a URL ainda redirecionar ou responder 404,
confira `https://github.com/DiogoBrasileiro/Milk/settings/pages`:
Source deve ser **GitHub Actions** e **Custom domain** não deve usar nenhum
domínio do Cartório One. O endereço esperado é
`https://diogobrasileiro.github.io/Milk/`.
O domínio é configurado no painel Pages, não no arquivo CNAME do build.

A verificação adicional de URL fica em
`.github/workflows/verify-milk-pages.yml`.
