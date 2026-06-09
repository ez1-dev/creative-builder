
## Ajustes no Detalhamento por Nota Fiscal

### 1. `src/lib/bi/comercialApi.ts` — `fetchComercialDetalhes`

Trocar a assinatura/implementação para paginar:

```ts
export async function fetchComercialDetalhes(
  p: ComercialParams,
  opts?: {
    escopo?: ComercialDetalheEscopo;
    page?: number;
    page_size?: number;   // máx 500 (limite backend)
    maxRows?: number;     // default 5000
  },
): Promise<ComercialDetalheRow[]> { ... }
```

Comportamento:

- Remover envio de `limit`.
- `page_size = Math.min(opts?.page_size ?? 500, 500)`.
- `maxRows = opts?.maxRows ?? 5000`.
- Loop: `page` inicia em `opts?.page ?? 1` e incrementa.
- A cada chamada, montar query com `escopo`, `page`, `page_size` via `buildQuery`.
- Extrair as linhas tolerando múltiplos envelopes:
  1. `unwrapRpcResponse(data, 'bi_comercial_detalhes')`.
  2. Se resultado for objeto, tentar nas chaves nessa ordem: `items`, `data`, `dados`, `rows`, `resultado`.
  3. Se for array, usar direto.
- Tentar capturar `total` (campos `total`, `total_registros`, `count`) quando o envelope for objeto.
- Concatenar em um acumulador.
- Parar quando: `acc.length >= maxRows`, ou `pageRows.length < page_size`, ou `total != null && acc.length >= total`.
- Retornar `acc.slice(0, maxRows)`.

### 2. `src/pages/bi/ComercialPage.tsx`

- `qDetalhes` chama `fetchComercialDetalhes(filters, { escopo: 'todas', maxRows: 5000 })` (sem `limit`).
- `queryKey` continua `['bi-comercial','detalhes', filters]`.
- Widget `table-mensal` (kind `table`) renderiza `DataTableBI` com `colsDetalhes` e `data={detalhes}`.
- `onRowClick`: abre drill `NOTA_FISCAL` com `{ cd_nf, cd_serie, cd_empresa, cd_filial }` (mantém o já implementado).
- Colunas (`colsDetalhes`) na ordem:
  Ano/Mês (`anomes_emissao`), Data Emissão (`dt_emissao`), Unidade (`unidade_negocio`), Empresa (`cd_empresa`), Filial (`cd_filial`), NF (`cd_nf`), Série (`cd_serie`), TNS (`cd_tns`), Tipo Movimento (`cd_tp_movimento`), Origem (`cd_origem`), Estado (`cd_estado`), Cliente (`cd_cliente`), Obra (`cd_prj` + `ds_abr_prj`), Revenda (`cd_rev_pedido`), Vl. Bruto (`vl_bruto`, currency), Impostos (`vl_impostos`, currency), Vl. Líquido (`vl_liquido`, currency), Devolução (`vl_devolucao`, currency), Qtd. Produtos (`qtd_produtos`, number).
- Filtros base + cross-filters continuam aplicados via `filters` (sem mudanças).
- `carregando` inclui `qDetalhes.isFetching`; `atualizar()` chama `qDetalhes.refetch()` (já implementado, manter).

### 3. Catálogo / layout

- `useComercialLayout.ts` e `comercialWidgetCatalog.ts`: confirmar título `"Detalhamento por Nota Fiscal"` para `table-mensal` (já aplicado — sem mudança adicional).

### Acceptance

- Nenhuma request contém `limit=5000`; em vez disso há 1..N chamadas com `page=1,2,...` e `page_size=500`.
- Loop para em `maxRows=5000`, em página parcial, ou ao atingir `total`.
- Grid mostra uma linha por NF com todas as colunas listadas.
- Clique em linha abre drill `NOTA_FISCAL`.
- Filtros e cross-filters continuam refletindo no resultado.
