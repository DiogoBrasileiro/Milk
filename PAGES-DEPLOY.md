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
