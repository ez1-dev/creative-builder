# BI Comercial — Sobrescrita da Meta na RPC de KPIs

## Contexto

O front (`/bi/comercial`, card "Faturamento" e gauge "% Atingimento") consome `GET /api/bi/comercial/kpis` e usa **exclusivamente** os campos retornados:

```ts
const fatLiquido = Number(kpis?.faturamento_liquido ?? kpis?.fat_liquido ?? kpis?.realizado ?? 0);
const meta       = Number(kpis?.meta ?? kpis?.vl_meta ?? 0);
const diferenca  = fatLiquido - meta;
const atingimento = meta > 0 ? (fatLiquido / meta) * 100 : 0;
```

Não há fallback fixo no front. Se `meta` vier `0`/`null`, o card mostra `R$ 0,00`.

## O que o backend precisa fazer

Em `GET /api/bi/comercial/kpis`, após executar a RPC do ERP:

1. Buscar a meta consolidada do período + unidade selecionados em `bi_meta_faturamento` (tabela do Lovable Cloud, sincronizada a partir de `EZORTEA.V_FATURAMENTO_META` via `POST /api/bi/comercial/metas/sincronizar`).
2. **Sobrescrever** os campos da resposta da RPC:
   - `meta` ← soma de `vl_meta` (ativos) das linhas de `bi_meta_faturamento` no período/unidade.
   - `diferenca` ← `fat_liquido - meta`.
   - `pct_atingimento` ← `meta > 0 ? (fat_liquido / meta) * 100 : 0`.
3. Quando `unidade_negocio = CONSOLIDADO`, somar `GENIUS + ESTRUTURAL ZORTEA`.
4. Precedência de origem dentro de `bi_meta_faturamento` para o par `(anomes_emissao, unidade_negocio)`: `UPQUERY_VM_FATURAMENTO` > `MANUAL`.

## Sincronização da view ERP

`POST /api/bi/comercial/metas/sincronizar` (proxy via edge function `sync-metas-upquery`) deve:

- Ler `EZORTEA.V_FATURAMENTO_META` para o intervalo `anomes_ini..anomes_fim`.
- Fazer `UPSERT` em `bi_meta_faturamento` com `origem_meta = 'UPQUERY_VM_FATURAMENTO'`, conflito em `(anomes_emissao, unidade_negocio)`.
- Retornar `linhas_detalhe`, `linhas_resumo`, `totais_por_mes`, `totais_por_unidade`.

Após sincronizar, a próxima chamada de `/api/bi/comercial/kpis` já deve refletir as metas atualizadas.

## Validação

| Cenário | Esperado |
|---|---|
| Meta cadastrada em `bi_meta_faturamento` | `kpis.meta` = soma do período |
| Meta ausente | `kpis.meta = 0`, card exibe R$ 0,00 |
| `UPQUERY` e `MANUAL` para o mesmo mês/unidade | Prevalece `UPQUERY` |
| `CONSOLIDADO` | Soma GENIUS + ESTRUTURAL ZORTEA |
