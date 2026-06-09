## Diagnóstico

Rodei `rg -n "30000000|30\.000\.000|metaDefault|defaultMeta|fallbackMeta"` no projeto — **zero ocorrências**. Não existe valor fixo de R$ 30.000.000 no frontend. O card hoje (linhas 651–691 de `ComercialPage.tsx`) já:

- Usa `??` (não `||`) para Meta: `Number(k?.meta ?? k?.vl_meta ?? 0)`.
- Lê `kpis` direto de `qKpis.data` (sem mock, sem override Cloud — removido na rodada anterior).
- Calcula `Diferença = liquido − meta`.

Se o card está exibindo R$ 30.000.000, o valor está vindo **da própria API** em `kpis.meta` (provavelmente da tabela `bi_meta_faturamento`). O log temporário confirmará isso.

## Mudanças

### 1. `src/pages/bi/ComercialPage.tsx` — bloco `resumo-faturamento`
- Adicionar `total_meta` à cadeia de fallback da Meta (conforme pedido):
  ```ts
  const meta = Number(k?.meta ?? k?.vl_meta ?? k?.total_meta ?? 0);
  ```
- Tudo o mais permanece (já está usando `??`, sem mock, sem hardcode).

### 2. `src/lib/bi/comercialApi.ts` — log temporário do payload bruto
Dentro de `fetchComercialKpis`, antes do `unwrapRpcResponse`:
```ts
// eslint-disable-next-line no-console
console.log('KPIS COMERCIAL RAW:', data);
```
Marcar com comentário `// TODO: remover após confirmar origem da meta` para facilitar a limpeza depois.

### 3. Tipo `ComercialKpis`
Adicionar `total_meta?: number | null` aos fallbacks opcionais já existentes.

## Fora de escopo
- Backend / RPC `bi_comercial_kpis` — se a API estiver retornando 30M, é problema do dado em `bi_meta_faturamento` (UPQUERY ou MANUAL). Resolvido fora do frontend.
- Outros widgets (`kpi-meta`, `gauge-atingimento`, `serie-mensal`) — já leem `kpis.meta` direto da API, sem fallback fixo.

## Validação
Após o deploy: abrir `/bi/comercial`, console deve imprimir `KPIS COMERCIAL RAW: { ..., meta: <valor>, ... }`. Se `meta` vier 30M no log, o problema está na API/Cloud; se vier outro valor mas o card exibir 30M, há mock em outro lugar (não foi encontrado nesta varredura, mas o log confirmaria).
