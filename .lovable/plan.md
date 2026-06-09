## Tabela mensal — abrir por Nota Fiscal

Trocar/expandir o widget **Tabela mensal** para exibir todas as informações em nível de **Nota Fiscal**, usando o endpoint já existente `/api/bi/comercial/detalhes` (função `fetchComercialDetalhes`, escopo `'todas'`).

### Alterações em `src/pages/bi/ComercialPage.tsx`

1. **Nova query** ao lado de `qMensal`:
   ```ts
   const qDetalhes = useQuery({
     queryKey: ['bi-comercial','detalhes', filters],
     queryFn: () => fetchComercialDetalhes(filters, { escopo: 'todas', limit: 5000 }),
     refetchOnWindowFocus: false,
     retry: 1,
   });
   const detalhes = qDetalhes.data ?? [];
   ```

2. **Novas colunas** `colsDetalhes: Column<ComercialDetalheRow>[]` cobrindo todos os campos retornados pela API:
   - Ano/Mês, Dt. Emissão, Unidade, Empresa, Filial, NF, Série, TNS, Tipo Mov., Origem
   - Estado, Cliente, Obra (cd_prj + ds_abr_prj), Revenda
   - Vl. Bruto, Impostos, Líquido, Devolução, Qtd. Produtos
   - Formatação: `formatCurrency` para valores monetários, `formatNumber` para quantidades, datas como string ISO.

3. **Render do widget** (linha ~754, branch `def.kind === 'table'`): trocar a fonte de `mensal` para `detalhes`:
   - Loading/erro/empty passam a observar `qDetalhes`.
   - `DataTableBI columns={colsDetalhes} data={detalhes}` com `onRowClick` abrindo drill `'NOTA_FISCAL'` (`{ cd_nf: r.cd_nf, cd_serie: r.cd_serie, cd_empresa: r.cd_empresa, cd_filial: r.cd_filial }`).
   - O mesmo render aplica-se ao bloco da linha ~611 (variant `'table'` do widget `serie-mensal` quando configurado como tabela) — manter usando `colsMensal` ali (é o combo configurado como tabela, não a Tabela mensal dedicada).

4. **Loading agregado** (`carregando`): incluir `qDetalhes.isFetching`.

5. **Botão "Atualizar"** (`atualizar()`): adicionar `qDetalhes.refetch()`.

6. **Título do widget** (`useComercialLayout.ts`, item `table-mensal`): renomear de `'Tabela mensal'` para `'Detalhamento por Nota Fiscal'`. Também atualizar `comercialWidgetCatalog.ts` (`'table-mensal'.title`).

### Considerações

- `limit: 5000` evita payload gigante; pode ser aumentado depois conforme uso. O `DataTableBI` já tem busca, ordenação e agrupamento ("Agrupar por"), o que o usuário pode usar para reagregar por Ano/Mês visualmente.
- Filtros do topo + cross-filters (estado/cliente/revenda/obra/mês) continuam aplicados automaticamente, pois `fetchComercialDetalhes` recebe `filters` completo.
- Sem mudanças no backend (FastAPI já expõe `/api/bi/comercial/detalhes`).

### Acceptance criteria

- O bloco "Tabela mensal" passa a se chamar "Detalhamento por Nota Fiscal" e mostra uma linha por NF com todas as colunas listadas acima.
- Filtros base e cross-filter por mês/estado/cliente/revenda/obra continuam afetando as linhas exibidas.
- Clicar numa linha abre o drill `NOTA_FISCAL` no drawer.
- O combo `serie-mensal` em variant `table` permanece com colunas mensais agregadas (inalterado).
