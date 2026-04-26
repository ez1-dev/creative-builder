# Flag para o popup de "Nova versão disponível"

## Objetivo

Permitir que o administrador ative/desative globalmente o popup do `UpdateNotifier` em **Configurações**. Quando desligado, nenhum usuário verá o modal — a aplicação continua funcionando normalmente e o admin ainda pode forçar atualização manualmente recarregando o navegador.

## Como vai funcionar

- Nova chave em `app_settings`: **`update_notifier_enabled`** (`'true'` | `'false'`, default `'true'`).
- Em **Configurações → aba "Geral / Sistema"**, adicionar um `Switch`:
  - **Label:** "Notificar usuários sobre novas versões"
  - **Descrição:** "Quando ativo, exibe o popup 'Nova versão disponível' assim que uma nova versão do EZ ERP IA for publicada. Desligue para suprimir o aviso para todos os usuários."
  - Apenas administradores enxergam/alteram (a RLS de `app_settings` já restringe escrita a `is_admin`).
- O `UpdateNotifier` lê essa flag junto com `app_version`:
  - Se `update_notifier_enabled = 'false'` → não dispara polling de versão/bundle, não escuta SW e nunca mostra o modal.
  - Se `'true'` (ou ausente) → comportamento atual.
- A flag é relida a cada ciclo de polling (1 min), então desligar/ligar reflete em até ~60s para sessões já abertas, e imediatamente para novos carregamentos.

## Arquivos a alterar

- `src/components/UpdateNotifier.tsx`
  - Antes de cada `runChecks`, ler `app_settings.update_notifier_enabled`. Se `'false'`, abortar o ciclo e fechar o modal caso esteja aberto.
  - Mesmo guard nos handlers de Service Worker.
- `src/pages/ConfiguracoesPage.tsx`
  - Carregar `update_notifier_enabled` no mesmo bloco que já lê outras chaves de `app_settings`.
  - Adicionar `Switch` na seção apropriada (Geral/Sistema), persistindo via `upsert({ key: 'update_notifier_enabled', value: 'true'|'false' }, { onConflict: 'key' })`.
  - Toast de confirmação ao salvar.
- `src/components/__tests__/UpdateNotifier.test.tsx`
  - Caso novo: quando `update_notifier_enabled='false'`, o modal nunca aparece mesmo com nova versão remota.

## Banco de dados

Não há migração estrutural — `app_settings` já existe (key/value/updated_at) e a RLS permite admins gravarem. Apenas inserimos a chave na primeira gravação via UI (upsert).

## Observações

- A flag é **global** (uma chave única em `app_settings`), aplicada a todos os usuários. Se no futuro quiser por usuário, dá para migrar para `user_preferences`.
- Não removemos a lógica de detecção — só a exibição do modal —, então quando o admin religar, o próximo poll volta a notificar normalmente.
