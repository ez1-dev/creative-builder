## Forçar atualização de versão no rodapé

O rodapé em `AppLayout.tsx` lê `packageJson.version` (hoje `1.0.3`). Se você ainda vê `1.0.2`, é bundle/PWA em cache — o `UpdateNotifier` compara com `app_version` no Cloud e só dispara o toast quando os dois divergem.

**Passos**

1. `package.json`: bump `version` para `1.0.4` (invalida o bundle e força o `AppLayout` a renderizar `v1.0.4`).
2. Atualizar o registro no backend (tabela `app_settings`, chave `app_version`) para `1.0.4` — isso faz o `UpdateNotifier` mostrar o aviso "Atualização publicada" para todos os usuários.
3. Nada de código no `AppLayout` — a interpolação `{brandName} v{packageJson.version} · © {ano} …` já está correta.

Depois do deploy, faça um hard-refresh (Ctrl/Cmd+Shift+R) uma vez para descartar o bundle antigo do service worker; usuários existentes verão o toast do `UpdateNotifier` normalmente.

**Não faremos**
- Não vamos mexer no formato do rodapé nem no `UpdateNotifier`.
