## Objetivo

Remover toda dependência de `supabase` (Cloud) na tela `Contabilidade — DRE` e consumir exclusivamente a API backend, incluindo os filtros de mês inicial/final.

## Mudanças em `src/pages/bi/contabilidade/DrePage.tsx`

### 1. Remover imports e estado de diagnóstico Cloud
- Remover `import { supabase } from '@/integrations/supabase/client'`.
- Remover a função `rodarDiagnostico` (que usa `supabase.from(...)` e `supabase.rpc(...)`).
- Remover o estado `diag` e o `<Card>` "Diagnóstico temporário (Cloud)".
- Remover o `useEffect` de mount que dispara `rodarDiagnostico()`.
- Remover a chamada a `rodarDiagnostico()` dentro de `carregarDre`.

### 2. Substituir `api.get` por `fetch` direto, incluindo `mes_ini` / `mes_fim`

Em `carregarDre`, trocar o bloco atual por:

```ts
const unidadeParam =
  !unidade || String(unidade).trim().toUpperCase() === 'TODOS'
    ? ''
    : unidade;

const url =
  `/api/bi/contabilidade/dre-matriz?ano=${ano || '2026'}` +
  `&mes_ini=${mesInicial}&mes_fim=${mesFinal}` +
  `&unidade=${encodeURIComponent(unidadeParam)}`;

const response = await fetch(url, {
  method: 'GET',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});

if (response.status === 401) {
  throw new Error('Sessão expirada. Faça login novamente.');
}
if (!response.ok) {
  throw new Error(`Erro ao carregar DRE: HTTP ${response.status}`);
}

const json = await response.json();
const linhas: DreLinha[] = Array.isArray(json)
  ? json
  : Array.isArray(json?.data) ? json.data : [];
setLinhasRaw(linhas);
```

Observação: a tela hoje usa `api.get` (helper que adiciona `Authorization: Bearer` a partir do `localStorage.erp_token` e prefixo do `getApiBaseUrl()`). O pedido pede `fetch` puro com `credentials: 'include'`. Vou seguir literalmente o pedido, mas isso pode quebrar a autenticação Bearer/ngrok que hoje funciona nas outras telas. **Confirmar:** seguir com `fetch` puro mesmo assim, ou manter o `api.get` (que já injeta Bearer + base URL correta) só trocando os parâmetros para incluir `mes_ini`/`mes_fim`?

### 3. Recarregar ao mudar mês
- Atualizar `useEffect([ano, unidade])` → `useEffect([ano, unidade, mesInicial, mesFinal])` para refletir o novo contrato (mês passa a ser server-side).

### 4. Limpar dead code
- Remover estado `diag` e tipos relacionados.
- Manter logs `console.log('[DRE] ...')` do fluxo principal (sem prefixo `[DIAG]`).

## Fora de escopo
- Backend FastAPI (`/api/bi/contabilidade/dre-matriz`) já existe conforme `docs/backend-bi-contabilidade-dre-matriz.md`. Se o backend ainda não aceita `mes_ini` / `mes_fim`, será necessário ajuste server-side — não coberto por este plano.
- Nenhuma mudança em outras telas, RPC, ETL ou layout visual.
