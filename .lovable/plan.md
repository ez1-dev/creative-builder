## Tela /bi/comercial — Dashboard Comercial

Dashboard de faturamento comercial separado por unidade de negócio (GENIUS, ESTRUTURAL ZORTEA, CONSOLIDADO), usando apenas `fonte_acao = 'VM_FATURAMENTO'`.

### 1. Backend (Lovable Cloud)

Criar a view `public.v_bi_faturamento_comercial` sobre `bi_faturamento` já normalizando unidade e impostos:

- `unidade_negocio`: `'GENIUS'` quando `cd_prj = '12'`, senão `'ESTRUTURAL ZORTEA'`
- `impostos = vl_icms + vl_ipi + vl_pis + vl_cofins + vl_iss + vl_ismsst + vl_difal` (a coluna real na tabela é `vl_ismsst`)
- `vl_liquido = vl_bruto + impostos` (mantém a fórmula pedida)
- filtra `fonte_acao = 'VM_FATURAMENTO'`
- expõe colunas necessárias para os painéis: `id_nf, cd_cliente, cd_estado, cd_prj, ds_abr_prj, anomes_emissao, mes_emissao, ano_emissao, qtd_produtos, vl_bruto, vl_devolucao, impostos, vl_liquido, unidade_negocio` + GRANT SELECT para `authenticated`.

### 2. Frontend

Nova página `src/pages/bi/ComercialPage.tsx` registrada em `App.tsx` (rota `/bi/comercial`), `AppSidebar` e `screenCatalog`.

Camada de dados em `src/lib/bi/comercial.ts` consultando a view direto via `supabase.from('v_bi_faturamento_comercial')`, agregando no cliente (volume pequeno por mês) e retornando estruturas tipadas para cada painel.

#### Filtros
- AnoMês início / fim
- Unidade (GENIUS, ESTRUTURAL ZORTEA, CONSOLIDADO) — abas no topo
- Estado (opcional)

#### Layout

Abas no topo: **CONSOLIDADO | GENIUS | ESTRUTURAL ZORTEA**. Cada aba reaproveita o mesmo bloco de componentes, mudando apenas o filtro/cor:

- GENIUS → laranja
- ESTRUTURAL ZORTEA → azul
- CONSOLIDADO → cor neutra (muted)

As cores são aplicadas via tokens semânticos do design system (sem hex hardcoded) — vou registrar tokens `--bi-genius`, `--bi-estrutural`, `--bi-consolidado` em `index.css` + `tailwind.config.ts`.

#### Componentes por aba

1. **KPIs superiores** (`KpiGrid` + `KpiCard`):
   - Faturamento, Faturamento Líquido, Impostos, Devolução, Nº Vendas, Nº Clientes, Nº Estados, Quantidade, Ticket Médio, Preço Médio.

2. **Gráfico mensal** (`ComboChartCard`) — barras de faturamento por mês + linha de ticket médio.

3. **Tabela mensal** (`DataTableBI`) — mês, vendas, clientes, qtd, faturamento, impostos, líquido, ticket médio, preço médio.

4. **Funil por estado** (`FunnelChartCard`) — top estados por faturamento.

5. **Mapa por estado** — mapa do Brasil com intensidade por faturamento. A biblioteca BI ainda não tem `BrazilMapCard`; criar `src/components/bi/charts/BrazilMapCard.tsx` usando SVG com 27 UFs (sem dependência externa) e exportar em `@/components/bi`.

6. **Donut de mix acumulado** (`DonutChartCard`) — participação por estado (ou por TNS quando consolidado).

7. **Painéis específicos**:
   - Aba GENIUS: `BarChartCard` "Faturamento por revenda" agrupando por `cd_grupo_cliente` / `ds_abr_fpj` (top N).
   - Aba ESTRUTURAL ZORTEA: `TreemapChartCard` "Obras" agrupando por `ds_abr_prj` (cd_prj ≠ 12).
   - Aba CONSOLIDADO: ambos painéis exibidos lado a lado.

### Detalhes técnicos

- Toda agregação no frontend usa `useMemo` sobre os registros da view (filtrados por período e, quando não consolidado, por `unidade_negocio`).
- CONSOLIDADO = soma direta de todos os registros da view (sem unir GENIUS+ESTRUTURAL artificialmente — vem da própria base).
- Fórmulas exatamente como pedido: `Ticket Médio = faturamento / nº vendas`, `Preço Médio = faturamento / quantidade` (com divisão por zero protegida).
- Reaproveita `MultiSelectFilter`, `DashboardTabs`, `useToast`, padrões da `Biblioteca BI`.
- Não toca `src/integrations/supabase/{client,types}.ts` nem `.env`.

### Arquivos previstos
- migração SQL criando `v_bi_faturamento_comercial` + GRANT
- `src/lib/bi/comercial.ts`
- `src/pages/bi/ComercialPage.tsx`
- `src/components/bi/charts/BrazilMapCard.tsx` (+ export no `index.ts`)
- tokens em `src/index.css` e `tailwind.config.ts`
- registro em `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/lib/screenCatalog.ts`
