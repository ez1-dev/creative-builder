

## Fallback para updates de Service Worker

### Diagnóstico
Verifiquei o projeto:
- **Não há service worker registrado** (`vite-plugin-pwa` não está instalado, não existe `sw.js` ou `registerSW`).
- Existe `public/manifest.json` com `display: "standalone"` (PWA "leve" só para instalabilidade — sem SW).
- Já existe `UpdateNotifier` que faz polling em `app_settings.app_version` e força reload com `caches.delete()`.

Conclusão: **não há SW para escutar `updatefound` / `controllerchange`**. Adicionar um SW agora contraria as orientações da plataforma (causa cache stale no preview iframe do Lovable). 

Por outro lado, o pedido faz sentido como **camada extra de segurança**: detectar quando o `index.html` servido muda (novo bundle publicado) **mesmo sem o admin atualizar manualmente** o `app_settings.app_version`. Isso cobre o cenário "deploy novo, mas esqueci de bumpar a versão no banco".

### Abordagem (sem service worker)
Implementar **detecção de novo bundle via hash do `index.html`**, complementando o `UpdateNotifier` atual. E **deixar pronto** um listener de SW que só ativa SE algum dia um SW for adicionado — fica inerte hoje.

### Mudança 1 — Estender `src/components/UpdateNotifier.tsx`

Adicionar segunda checagem em paralelo ao polling de versão (mesmo intervalo de 60s):

```ts
const checkBundleHash = async () => {
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    const html = await res.text();
    // extrai o src do bundle principal: <script type="module" src="/assets/index-XXXX.js">
    const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!match) return;
    const currentBundle = match[1];
    if (lastBundleRef.current === null) {
      lastBundleRef.current = currentBundle;
      return;
    }
    if (lastBundleRef.current !== currentBundle) {
      setLatestVersion('novo build');
      setShow(true);
    }
  } catch {
    // silencioso
  }
};
```

Roda junto com `checkVersion()` no mesmo `setInterval`. Resultado: **dois gatilhos** abrem o modal:
1. Admin bumpou versão em `app_settings` (gatilho explícito — atual).
2. O hash do bundle JS mudou (gatilho automático — novo).

O modal continua o mesmo (não-fechável, botão "Atualizar agora" que limpa cache + reload).

### Mudança 2 — Listener inerte de Service Worker (preparação futura)

Adicionar bloco no mesmo `useEffect`:

```ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return; // nenhum SW registrado hoje → no-op
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          setLatestVersion('novo build');
          setShow(true);
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
```

Como **hoje não existe SW registrado**, `getRegistration()` retorna `undefined` e o bloco não faz nada. Quando/se um SW for adicionado no futuro, o fallback já está pronto.

### Mudança 3 — Pequena melhoria no botão "Atualizar agora"

Antes do reload, se houver SW, fazer `skipWaiting`:

```ts
if ('serviceWorker' in navigator) {
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
```

Inerte hoje, útil amanhã.

### Detalhes técnicos
- **Sem novas dependências**, sem `vite-plugin-pwa`, sem registro de SW novo.
- Polling continua único (60s) — só adiciona 1 fetch de `/index.html` por ciclo.
- `fetch('/index.html', { cache: 'no-store' })` garante leitura fresca.
- O hash é gerado pelo Vite no build (`index-[hash].js`), então muda a cada deploy.
- Em `dev` (Vite serve sem hash), o regex pode não casar — comportamento: silencioso, sem disparo (ok).
- Não interfere no preview do Lovable (sem SW, sem cache de assets).

### Fora de escopo
- Adicionar `vite-plugin-pwa` ou registrar service worker (contra-indicado pela plataforma para preview iframe).
- Cache offline / estratégia de runtime caching.
- Toast "atualizando..." com countdown.

### Resultado
Mesmo se o admin esquecer de bumpar `app_settings.app_version`, qualquer deploy novo (que muda o hash do bundle JS) dispara o mesmo modal bloqueante "Nova versão disponível" em até 60s. E o código já está preparado para acionar via `updatefound` do dia em que um service worker for adicionado.

