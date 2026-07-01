## Objetivo
Alinhar a tela **01 — Resumo Folha** (`/rh/resumo-folha`) ao contrato mais recente do endpoint `GET /api/rh/resumo-folha/dashboard`, incluindo modo Mensal, filtro de empresa, botão "Sincronizar RH" e exibição correta de campos texto (`H:MM`).

## Mudanças

### 1. `src/lib/rh/types.ts`
- Adicionar `cd_filial?: string` em `ResumoFolhaFilialAgg`.
- Aceitar `qtd_horas` e `qtd_hora_extra` como `string | number` (backend manda `"H:MM"`).
- Adicionar `cd_evento?: string`/`ds_evento?: string` em `ResumoFolhaEventoAgg` (mantendo `codigo`/`descricao` como aliases).
- Adicionar `cd_tp_evento?: string` em `ResumoFolhaTipoEventoAgg`.
- `ResumoFolhaMensalAgg.competencia` mapeia `anomes_competencia`.

### 2. `src/lib/rh/api.ts`
- `normalizeFiliais`: adicionar `cd_filial` (aliases `cd_filial`, `codfil`); preservar `qtd_horas`/`qtd_hora_extra` como **string** quando vier "H:MM" (não passar por `numOrUndef`).
- `normalizeEventos`: incluir aliases `cd_evento`, `ds_evento`; ordenar por `valor desc`.
- `normalizeDashboard`: mapear `tipos_evento` com alias `cd_tp_evento`; `mensal` com alias `anomes_competencia`.
- `fetchResumoFolhaDashboard`: reativar o parâmetro `modo` (`"acumulado" | "mensal"`) enviando para a API quando informado.

### 3. `src/pages/rh/ResumoFolhaPage.tsx`
- Filtros no topo: **Ano/mês inicial, Ano/mês final, Empresa (`codemp`, default 1), Toggle Acumulado / Mensal** (Tabs ou Segmented). Remover o filtro de Filial/Matrícula do topo (fora do escopo desse endpoint) — manter Filial como filtro visual em memória sobre a tabela.
- Duas queries com `enabled` alternado pelo modo:
  - **Acumulado**: renderiza KPIs, tabelas Proventos/Descontos, Filial, Tipos de Evento (comportamento atual).
  - **Mensal**: renderiza **gráfico de barras** (Recharts `BarChart` com barras `provento`, `desconto`, `total_liquido` por `anomes_competencia`) + **tabela mensal** (competência, provento, desconto, líquido, totais).
- Tabela "Por Filial": adicionar coluna `cd_filial` antes de `filial`; renderizar `qtd_horas` e `qtd_hora_extra` como texto cru (sem `formatHorasMin`).
- Tabelas de Proventos/Descontos: usar `cd_evento` + `ds_evento`; ordenação já vem do backend.
- Tipos de Evento: rótulo passa a ser `cd_tp_evento`.
- Adicionar botão **"Sincronizar RH"** no header (reutilizar `SincronizarRhDialog` já existente — invalida `["rh"]` e recarrega).
- Remover o banner "Endpoint indisponível" só se houver erro real; manter avisos `Campo não retornado pela API: x` como estão.

### 4. Sem mudanças
- Telas 02/03/04/99 e `SincronizarRhDialog` permanecem como estão.

## Não fazer
- Não usar `debug=true`.
- Não tocar em `.env` nem em cliente Supabase.
- Não alterar cores hardcoded — usar tokens.
