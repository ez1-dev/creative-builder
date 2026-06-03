# Tela de Validação BI Faturamento

## Rota
- `/bi/faturamento-validacao` → registrada em `src/App.tsx` dentro do `AppLayout`, protegida por `ProtectedRoute`.
- Novo arquivo: `src/pages/bi/FaturamentoValidacaoPage.tsx`.

## Layout
Usa `PageHeader` + componentes da biblioteca BI (`@/components/bi`):

1. **Barra de filtros** (sticky no topo, grid responsivo):
   - `ANOMES_INI` / `ANOMES_FIM` — inputs texto `YYYYMM` (default: ano corrente jan→mês atual).
   - `CD_TP_MOVIMENTO`, `CD_ORIGEM`, `CD_EMPRESA`, `CD_FILIAL`, `CD_TNS`, `CD_CENTRO_CUSTOS_3`, `CD_NF` — inputs texto livres (multi-valor separado por vírgula).
   - Botões: **Atualizar** (refetch) e **Exportar CSV** (exporta a aba detalhada atual).

2. **Seção 1 — Cards de resumo** (`KpiCard` em grid de 7):
   - Qtd Linhas (number), VL_BRUTO, VL_TOTAL, VL_DEVOLUCAO, VL_ICMS, VL_PIS, VL_COFINS (BRL, abreviado).

3. **Seção 2 — Resumo por movimento** (`DataTableBI`):
   - Colunas: `anomes_emissao`, `cd_tp_movimento`, `cd_origem`, `qtd_linhas`, `vl_bruto`, `vl_total`, `vl_devolucao`, `vl_icms`, `vl_pis`, `vl_cofins`.
   - Ordenado por `anomes_emissao` desc.

4. **Seção 3 — Resumo por TNS** (`DataTableBI`):
   - Colunas: `cd_tns`, `cd_natureza`, `qtd_linhas`, `vl_total`, `vl_devolucao`.

5. **Seção 4 — Detalhes** (`DataTableBI` com paginação server-side):
   - Colunas: `cd_tp_movimento`, `cd_origem`, `cd_empresa`, `cd_filial`, `cd_nf`, `cd_serie`, `dt_emissao`, `anomes_emissao`, `cd_tns`, `cd_cliente`, `cd_centro_custos_3`, `vl_bruto`, `vl_total`, `vl_devolucao`, `created_at` (vem do `atualizado_em`).
   - `page` / `page_size` (default 50).

## Camada de dados
- Novo módulo: `src/lib/bi/faturamentoValidacao.ts` com 4 funções consumindo FastAPI via `apiFetch` (igual ao padrão de `src/lib/api.ts`):
  - `getResumo(filtros)` → `GET /api/bi/faturamento/resumo`
  - `getPorMovimento(filtros)` → `GET /api/bi/faturamento/por-movimento`
  - `getPorTns(filtros)` → `GET /api/bi/faturamento/por-tns`
  - `getDetalhes(filtros, page, page_size)` → `GET /api/bi/faturamento/detalhes`
- Todos os campos numéricos passam por `Number(...)` antes de exibir; valores monetários usam `formatCurrency`; vazios → `NoDataState`.
- React Query (`useQuery`) por seção, com `queryKey` baseada nos filtros. Botão **Atualizar** chama `refetch` das 4 queries.
- Documento `docs/backend-bi-faturamento-validacao.md` descrevendo contratos esperados dos 4 endpoints (parâmetros, payload, observação: ler apenas `public.bi_faturamento`, não consultar ERP).

## Exportar CSV
- Função local que monta CSV dos detalhes atuais (página visível) — sem nova dependência. Usa `Blob` + `URL.createObjectURL`.

## Sidebar / navegação
- Adicionar item "Faturamento — Validação BI" em `src/components/AppSidebar.tsx` sob o grupo BI/Faturamento (ou criar agrupamento "BI" se não existir).
- Registrar a tela em `src/lib/screenCatalog.ts` para permissões.

## Observações
- Tela 100% leitura, sem chamadas Supabase diretas e sem consulta ao ERP — apenas FastAPI sobre `bi_faturamento`.
- Sem mudanças no Cloud (sem migration).
- Backend FastAPI dos 4 endpoints é fora do escopo desta entrega (documentado no `.md` para o time de backend implementar).
