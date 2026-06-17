## Objetivo
Garantir que o botão "Sincronizar De/Para DRE" use exclusivamente `POST` com `Authorization: Bearer <token>` e `Content-Type: application/json`, e que erros do backend apareçam no bloco de debug com status + corpo da resposta.

## Diagnóstico
O arquivo `src/lib/bi/dreSincronizacaoApi.ts` já chama `postJson('/api/bi/contabilidade/sync-depara-dre', {})`, que usa `method: 'POST'` e os headers exigidos. Não há fallback GET. O que falta é deixar a chamada de sincronização explícita (sem passar pelo helper genérico) e enriquecer a mensagem de erro para o painel de debug.

## Mudanças

### 1. `src/lib/bi/dreSincronizacaoApi.ts`
Reescrever apenas a função `sincronizarDeparaDreErp` para uma chamada `fetch` direta, no padrão exato pedido:

```ts
export async function sincronizarDeparaDreErp(): Promise<SyncDeparaResponse> {
  const token = api.getToken();
  const url = `${getApiUrl()}/api/bi/contabilidade/sync-depara-dre`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: "{}",
  });

  const raw = await response.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { /* mantém raw */ }

  if (!response.ok) {
    const detail =
      (json && (json.detail || json.message)) ||
      raw ||
      `HTTP ${response.status} ${response.statusText}`;
    throw new Error(
      `POST ${url} → ${response.status} ${response.statusText}\n` +
      (typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2))
    );
  }

  return {
    success: Boolean(json?.success ?? true),
    origem: String(json?.origem ?? 'ERP Senior SQL Server'),
    destino: String(json?.destino ?? 'Lovable Cloud / bi_dre_depara_conta_ccu'),
    total_registros: Number(json?.total_registros ?? 0),
    message: String(json?.message ?? 'Sincronização concluída.'),
  };
}
```

Restante do arquivo (diagnóstico ERP e validação Cloud) permanece igual.

### 2. `src/pages/bi/contabilidade/DreSincronizacaoDeparaPage.tsx`
Nenhuma alteração funcional — o `<details>` "Detalhe técnico" já exibe `erroSync`, que agora inclui método, URL, status e corpo retornado pela API.

## Itens fora de escopo
- Lógica da tela DRE (`DrePage.tsx`).
- Endpoints de diagnóstico ERP (já são GET por contrato).
- Validação no Lovable Cloud (continua via client Supabase com anon key).
