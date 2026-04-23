

## Aviso de atualização com refresh obrigatório

### Visão geral
Quando uma nova versão do app for publicada, todos os usuários conectados verão um **modal bloqueante** avisando "Nova versão disponível" com botão **"Atualizar agora"** que recarrega a página (limpando cache). Sem opção de "depois".

### Como detectar nova versão
A versão atual já existe em `package.json` (hoje `1.0.0`) e é exposta no rodapé via `packageJson.version`. A estratégia:

1. No build, o Vite injeta `import.meta.env.VITE_APP_VERSION` (lido de `package.json`) — essa é a **versão carregada no navegador do usuário**.
2. Em paralelo, manter no banco a **versão "oficial" publicada** numa tabela `app_settings` (chave `app_version`).
3. O frontend faz polling a cada 60s comparando `versão carregada` vs `versão no banco`. Se diferentes → mostra modal bloqueante.

A tabela `app_settings` **já existe** no projeto (com RLS: admin gerencia, autenticados leem) — perfeito para isso.

### Mudança 1 — `vite.config.ts`
Injetar a versão do `package.json` em `import.meta.env.VITE_APP_VERSION`:
```ts
import pkg from './package.json';
// dentro de defineConfig:
define: {
  'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
}
```

### Mudança 2 — Insert inicial em `app_settings` (via insert tool)
```sql
INSERT INTO app_settings (key, value) VALUES ('app_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;
```

### Mudança 3 — Novo componente `src/components/UpdateNotifier.tsx`
- `useEffect` ao montar: chama `checkVersion()` e agenda `setInterval(checkVersion, 60_000)`.
- `checkVersion()` lê `app_settings` onde `key = 'app_version'`. Se `value !== import.meta.env.VITE_APP_VERSION` → `setShowDialog(true)`.
- Renderiza um `<Dialog>` (shadcn) **não-fechável** (sem `onOpenChange`, sem botão X) com:
  - Ícone de download
  - Título: "Nova versão disponível"
  - Texto: "Uma atualização do EZ ERP IA foi publicada. Clique em **Atualizar agora** para carregar a nova versão."
  - Versão atual → nova versão (badge)
  - Botão único: **"Atualizar agora"** → executa:
    ```ts
    if ('caches' in window) await Promise.all((await caches.keys()).map(k => caches.delete(k)));
    window.location.reload();
    ```

### Mudança 4 — Integrar em `src/components/AppLayout.tsx`
Renderizar `<UpdateNotifier />` dentro do layout autenticado (junto com `<AiAssistantChat />`), para não aparecer na tela de login.

### Mudança 5 — Nova seção em `ConfiguracoesPage.tsx` (admin)
Na aba **"Configurações Gerais"** (ou nova mini-aba "Versão"), adicionar card "Versão do Sistema":
- Mostra versão atual carregada (`import.meta.env.VITE_APP_VERSION`)
- Mostra versão no banco (`app_settings.app_version`)
- Campo input + botão **"Publicar nova versão"** que faz `UPSERT` em `app_settings` com a nova versão digitada.
- Texto explicativo: "Após publicar uma nova versão do app no Lovable, atualize aqui o número da versão para que todos os usuários conectados sejam forçados a recarregar."

Visível só para admin (já há esse check na tela).

### Fluxo de uso
1. Dev/admin publica novo deploy no Lovable (com `package.json` bump para ex. `1.0.1`).
2. Admin entra em Configurações → seta versão para `1.0.1` e clica "Publicar nova versão".
3. Em até 60s, todos os usuários online recebem o modal bloqueante.
4. Usuário clica "Atualizar agora" → cache limpo + reload → carrega a nova versão.

### Detalhes técnicos
- Sem mudança em rotas, sidebar, schema (tabela já existe).
- Polling leve: 1 SELECT a cada 60s por usuário online.
- O modal usa `<Dialog>` sem `onOpenChange` e sem `<DialogClose>`, então ESC e clique fora não fecham.
- Em caso de erro na consulta (rede caiu): silencioso, tenta de novo no próximo ciclo.
- Não persiste "já vi este aviso" — toda atualização precisa ser aplicada.

### Fora de escopo
- Bump automático do `package.json` (continua manual).
- Notificação push/email.
- Forçar logout. Apenas reload.
- Service worker / PWA update prompt (pode ser fase 2).
- Histórico de versões publicadas.

### Resultado
Sempre que admin publicar uma nova versão e atualizar o número em Configurações, todos os usuários online verão um modal bloqueante e serão obrigados a recarregar para continuar usando o sistema.

