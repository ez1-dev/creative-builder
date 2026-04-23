

## Corrigir loop infinito do popup "Nova versão disponível"

### Problema
O popup "Nova versão disponível" aparece, o usuário clica em **Atualizar agora**, a página recarrega — mas o popup volta imediatamente, criando um loop que impede o uso do app (PWA e navegador comum).

### Causa raiz
No `src/components/UpdateNotifier.tsx` há **duas verificações** rodando em paralelo:

1. **`checkVersion`** — compara `app_settings.app_version` (Supabase) com `CURRENT_VERSION` do `package.json`. Persiste em `localStorage` (`app:last_seen_version`) ao clicar em atualizar → **funciona OK**.

2. **`checkBundleHash`** — busca `/index.html`, extrai o hash do bundle (`/assets/index-XXXX.js`) e compara com `lastBundleRef.current` (memória RAM). 

**O bug está em (2)**:
- Após o `window.location.reload()`, `lastBundleRef.current` volta a `null` (não há persistência em `localStorage` do bundle no momento da inicialização efetiva).
- Olhando o código atual: `handleRefresh` até **tenta** salvar `lastBundleRef.current` em `LS_LAST_BUNDLE`, mas nesse momento `lastBundleRef.current` ainda contém o bundle **antigo** (foi setado no primeiro `checkBundleHash` antes de detectar mudança). Quando o `checkBundleHash` posterior detecta o **novo** bundle e dispara o popup, esse novo hash **nunca é salvo** antes do reload.
- Resultado pós-reload: `lastBundleRef` lê do localStorage o hash **antigo**; primeira chamada de `checkBundleHash` enxerga o novo hash do HTML e **dispara o popup de novo** → loop infinito.

Adicionalmente, no popup atual, `latestVersion` fica como string `"novo build"` (não numérica), e o `handleRefresh` só salva `LS_LAST_VERSION` quando `!latestVersion.startsWith('novo')` — ou seja, no caso "novo build" nem a versão é persistida, agravando o loop.

### Solução

**Reescrever a lógica de detecção/persistência do bundle** em `src/components/UpdateNotifier.tsx`:

1. **Persistir o bundle detectado IMEDIATAMENTE quando o popup é mostrado**, não no clique em "Atualizar":
   - No momento em que `checkBundleHash` detecta diferença e vai mostrar o popup, gravar o **novo hash** em `localStorage` (LS_LAST_BUNDLE) **antes** de `setShow(true)`.
   - Assim, após o reload, `lastBundleRef` lê o hash novo do localStorage, compara com o atual (igual) e **não dispara mais o popup**.

2. **Fazer a inicialização ler o bundle atual e comparar com o salvo de forma idempotente**:
   - Ao montar o componente, primeiro chama `checkBundleHash` que: busca `/index.html`, extrai hash atual; se `localStorage` já tem um hash igual → não faz nada; se diferente → mostra popup e persiste o novo.
   - Eliminar a lógica de "primeira execução grava baseline e não alerta" (ela mascara o estado inconsistente).

3. **Persistir versão também quando for "novo build"**:
   - Em `handleRefresh`, salvar `LS_LAST_VERSION = CURRENT_VERSION` (não a string "novo build"), garantindo que `checkVersion` use a versão atual como baseline.
   - Quando `latestVersion` vier do Supabase com número real, salvar essa string.

4. **Adicionar guard de "já reloadei recentemente"** para impedir loop em qualquer cenário residual:
   - Salvar `app:last_reload_at` (timestamp) em `handleRefresh`.
   - Na montagem, se `Date.now() - last_reload_at < 30s`, **suprimir o popup** por 30 segundos (cooldown), independentemente do que `checkBundleHash` ou `checkVersion` retornarem. Isso é um cinto de segurança contra qualquer loop futuro.

5. **Tratar dev vs produção**:
   - Em dev (Vite), `/index.html` não tem hash → match falha → ok, já é tratado.
   - Em preview Lovable (iframe), o popup deve continuar funcionando, mas o cooldown evita travamentos.

### Mudanças (apenas 1 arquivo)

`src/components/UpdateNotifier.tsx`:
- Adicionar constante `LS_LAST_RELOAD = 'app:last_reload_at'` e `RELOAD_COOLDOWN_MS = 30_000`.
- No `useEffect` de montagem, antes de qualquer check: ler `LS_LAST_RELOAD`; se dentro do cooldown, agendar próxima verificação só após o cooldown expirar.
- Em `checkBundleHash`: simplificar para sempre comparar contra `localStorage.getItem(LS_LAST_BUNDLE)`; se diferente, **gravar imediatamente o novo hash** e mostrar popup.
- Em `checkVersion`: idem — gravar `LS_LAST_VERSION = remote` antes de mostrar popup.
- Em `handleRefresh`: gravar `LS_LAST_RELOAD = Date.now()`, sempre persistir versão atual mesmo em "novo build", manter limpeza de caches.

### Casos de teste manuais
1. Popup aparece → clicar "Atualizar agora" → reload → popup **não volta**.
2. Aguardar 1 min e fazer um deploy real → popup aparece novamente uma vez.
3. Recarregar manualmente (F5) dentro de 30s pós-update → popup não aparece (cooldown).
4. Em PWA instalado → mesmo comportamento, sem loop.
5. Em dev local (`/index.html` sem hash) → nenhum popup espúrio.

### Fora de escopo
- Mudanças no Service Worker (não há SW registrado hoje).
- Estratégia de cache do build (mantida).
- Mudança no fluxo de `app_settings.app_version` no Supabase.

### Resultado
O popup aparece **uma única vez por nova versão**, o reload limpa o estado, e o cooldown garante que nenhum bug residual cause loop. Usuários (web e PWA) voltam a usar o app normalmente após clicar em "Atualizar agora".

