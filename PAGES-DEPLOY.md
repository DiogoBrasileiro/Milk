# Publicação do MilkFlow no GitHub Pages

URL: https://diogobrasileiro.github.io/Milk/

1. Em Settings → Pages → Build and deployment, escolher Source = GitHub Actions.
2. Ao atualizar main, o workflow compila o Vite com base /Milk/, verifica os artefatos e publica.

## Limites do GitHub Pages
O Pages é estático. Esta edição usa registros locais no navegador, sem
sincronização multi-dispositivo, sem conta online e sem recuperação em nuvem.
Não use dispositivos compartilhados. Exporte regularmente um backup JSON.
Limpar os dados do navegador apaga os registros locais.

O banco existente no Google AI Studio não será migrado nem modificado.

## Segurança
O backend Express/Supabase original ainda precisa de autenticação real e de
revisão de permissões RLS antes de uma publicação pública. Um arquivo antigo
com dados de usuários foi removido do HEAD da branch, porém permanece no
histórico de commits e pode exigir saneamento histórico e rotação de códigos.


## Diagnóstico: implantação concluída mas site não abre

O workflow `deploy-pages.yml` publica a branch `main` com
`bun run build:pages`. Essa é a versão **local**, sem conexão de produção
com Supabase. A versão Supabase está em desenvolvimento no PR #2 e não
deve ser integrada antes da autenticação/RLS serem validadas.

Se o endereço `https://diogobrasileiro.github.io/Milk/` apresentar 404
ou redirecionar para outro projeto, abra:
`https://github.com/DiogoBrasileiro/Milk/settings/pages`

1. Em **Build and deployment**, deixe **Source: GitHub Actions**.
2. Em **Custom domain**, remova qualquer domínio de outro projeto.
   Em especial, **não utilizar um domínio do Cartório One** no MilkFlow.
3. Confirme que o endereço oficial mostra `diogobrasileiro.github.io/Milk/`.
4. Confira a execução de `Build and deploy MilkFlow to GitHub Pages`
   na aba Actions. Não escolha "Unpublish site".
5. Faça atualização forçada no navegador e teste em outro dispositivo.

A configuração de domínio personalizado é um dado do repositório
no GitHub Pages, **não** um arquivo CNAME desta build por Actions.
Alterar os arquivos `public/CNAME` não substitui remover o domínio
da tela de Settings > Pages.
