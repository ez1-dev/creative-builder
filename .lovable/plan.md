

## Diagnóstico: modal não some após atualização e novo deploy não dispara

### Sintomas observados (logs)
- `app_settings.app_version = "1.0.1"` (banco)
- Polling continua retornando `1.0.1` a cada 60s
- Modal aparece, usuário clica "Atualizar agora", página recarrega, mas o **modal volta a aparecer** (ou nunca some)
- `CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0'`

### Causa raiz
**`VITE_APP_VERSION` não está definido em lugar nenhum.** Não existe `.env` com essa variável, não há `define` no `vite.config.ts`, e o `package.json` (que tem a versão real) não é lido em runtime no browser. Resultado:

- `CURRENT_VERSION` sempre vale `'0.0.0'`
- Banco tem `'1.0.1'` → `'0.0.0' !== '1.0.1'` → modal abre **sempre**
- Após o reload, `CURRENT_VERSION` continua `'0.0.0'` → modal abre **de novo**, em loop

E o `AppLayout` mostra `v{packageJson.version}` no rodapé (lê o `package.json` direto via import) → o rodapé mostra a versão certa, mas o `UpdateNotifier` não.

Sobre "não sai caixa de nova versão" para deploys novos: como o app está em `id-preview--*.lovableproject.com` (modo dev do Vite, sem hash no bundle — o `index.html` mostra `/src/main.tsx?t=...`), o `checkBundleHash` **nunca casa** o regex `/assets/index-[hash].js` e fica silencioso. Em produção (publicado) funcionaria, mas em preview não.

### Correção (1 arquivo)

**`src/components/UpdateNotifier.tsx`**:

1. **Trocar a fonte da versão atual** — usar `package.json` diretamente, igual ao `AppLayout`:
   ```ts
   import packageJson from '../../package.json';
   const CURRENT_VERSION = packageJson.version;
   ```
   Remove a dependência de `VITE_APP_VERSION`. Agora `CURRENT_VERSION` será `"1.0.0"` (ou o que estiver no `package.json`) de verdade.

2. **Persistir versão "já vista" em `localStorage`** para quebrar o loop:
   - Chave: `app:last_seen_version`
   - Após reload bem-sucedido, gravar `localStorage.setItem('app:last_seen_version', remote)` ANTES do reload
   - No `checkVersion`, comparar `remote !== CURRENT_VERSION` **E** `remote !== localStorage.getItem('app:last_seen_version')`
   - Isso garante: se o usuário já clicou "Atualizar agora" para a versão `1.0.1`, mas o `package.json` do bundle ainda é `1.0.0` (porque o admin não bumpou no código), o modal não fica reabrindo eternamente

3. **Mesmo tratamento para `checkBundleHash`**:
   - Salvar `app:last_seen_bundle` no localStorage antes do reload
   - Comparar contra ele na próxima checagem

4. **Em modo dev (preview Lovable)**, o regex de hash não casa — mantém comportamento silencioso, sem warning.

### Pseudocódigo da lógica de comparação

```ts
const lastSeenVersion = localStorage.getItem('app:last_seen_version');
if (remote !== CURRENT_VERSION && remote !== lastSeenVersion) {
  setLatestVersion(remote);
  setShow(true);
}

const handleRefresh = async () => {
  if (latestVersion && !latestVersion.startsWith('novo')) {
    localStorage.setItem('app:last_seen_version', latestVersion);
  }
  if (lastBundleRef.current) {
    localStorage.setItem('app:last_seen_bundle', lastBundleRef.current);
  }
  // ... limpar caches + reload
};
```

E na inicialização do `checkBundleHash`, ler `localStorage.getItem('app:last_seen_bundle')` como baseline em vez de `null`.

### Como o admin "publica" uma nova versão (fluxo correto)
1. Bumpar `version` no `package.json` (ex.: `1.0.0` → `1.0.1`)
2. Publicar o app (Lovable Publish)
3. Atualizar `app_settings.app_version` na tela de Configurações para o mesmo valor `1.0.1`
4. Usuários online verão o modal em até 60s, clicam "Atualizar", recarregam com `package.json = 1.0.1` → comparação `1.0.1 === 1.0.1` → modal não reaparece ✅

### Fora de escopo
- Bump automático do `package.json` no deploy (continua manual).
- Trigger no banco para sincronizar `app_version` automaticamente.

### Resultado
- Modal aparece **somente quando** a versão remota for diferente da versão real do bundle (lida do `package.json`).
- Após "Atualizar agora", o modal não reabre em loop, mesmo se a versão real do bundle ainda não estiver alinhada.
- Em produção publicada, o `checkBundleHash` continua como fallback automático.

