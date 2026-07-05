## Objetivo

Substituir a página atual `RH > Quadro de Colaboradores` (que hoje lista colaboradores em tabela) por um **dashboard de headcount** consumindo os novos endpoints do FastAPI. Nenhuma regra de ponto-no-tempo, ativo/demitido ou headcount é calculada no front — a API já entrega tudo pronto.

## Endpoints consumidos

- `GET /api/rh/quadro-colaboradores/dashboard?data_ref=YYYY-MM-DD` → snapshot com KPIs + quebras (sexo, escolaridade, faixa etária, tempo de casa, filial, situação, vínculo, empresa opcional).
- `GET /api/rh/quadro-colaboradores/historico?anomes_ini=YYYYMM&anomes_fim=YYYYMM` → série mensal `{ anomes, total }`.
- (Reservado) `GET /api/rh/quadro-colaboradores/export` para o botão Exportar Excel — se retornar 404/405/501, mostrar "Exportação pendente na API".

Uso do `api` client existente (`src/lib/api.ts`) mantém JWT + header `ngrok-skip-browser-warning`.

## Arquivos afetados

**Novos:**
- `src/lib/rh/quadroDashboardApi.ts` — funções `fetchQuadroDashboard(dataRef)`, `fetchQuadroHistorico(anomesIni, anomesFim)`, `exportQuadroDashboard(...)`; tipos `QuadroDashboard`, `QuadroBreakdownItem`, `QuadroHistoricoItem`. Normaliza payload preservando `null` explicitamente (não converte para 0).

**Editados:**
- `src/lib/rh/types.ts` — adicionar interfaces do dashboard/histórico (sem tocar nas existentes).
- `src/pages/rh/QuadroColaboradoresPage.tsx` — reescrita completa: passa de "lista + filtros de tabela" para dashboard de headcount.

Nada em Supabase/Cloud. Nada de backend.

## Layout da página nova

```text
[Header RH]  Data ref [datepicker]  Histórico [anomes_ini] → [anomes_fim]  [Atualizar] [Exportar Excel]

┌──────────── KPIs (grid 4 col desktop, 2 col tablet) ─────────────┐
│ Total | Masculino | Feminino | Jovem Aprendiz                    │
│ Estagiários | PCD | Admitidos mês | Demitidos mês                │
│ Trabalhando | Férias | Aux Doença | Acidente                     │
│ Lic Maternidade | Aposentadoria (só se vier da API)              │
└──────────────────────────────────────────────────────────────────┘

┌─ Histórico (linha/área, full width) ────────────────────────────┐

┌─ Sexo (donut) ─┐ ┌─ Situação (barras) ─┐ ┌─ Vínculo (barras) ─┐

┌─ Escolaridade (barras horizontais, desc) ─┐ ┌─ Faixa etária ─┐

┌─ Tempo de casa (barras) ─┐ ┌─ Filial (tabela ordenada desc) ─┐

┌─ Empresa (só se API retornar; senão aviso "pendente de regra na API") ─┐
```

## Comportamento

- **Estado inicial**: `dataRef = hoje`; `anomesIni = YYYY01` do ano de `dataRef`; `anomesFim = YYYYMM` de `dataRef`.
- **Botão Atualizar** invalida ambas as queries do React Query.
- **KPIs com `null`**: renderizados via `KpiOrMissing` reutilizado, exibindo "Campo pendente na API" — nunca 0. Cards para campos que a API não retornou (ex.: `aposentadoria`) ficam ocultos.
- **Blocos de quebra ausentes** (array vazio ou chave ausente): esconder o card inteiro; para `empresa`, mostrar aviso textual "Classificação Empresa pendente de regra na API".
- **Exportar Excel**: usa `ExportButton` apontando para `/api/rh/quadro-colaboradores/export?data_ref=...`. Em 404/405/501 exibir toast "Exportação pendente na API" (já suportado pela lógica do ExportButton com ajuste mínimo — ou capturar no próprio botão wrapper).

## Componentes reutilizados

- `KpiCard` / `KpiOrMissing` (RH), `RhPageHeader`, `DataTableBI`, `ExportButton`.
- Gráficos: `LineChartCard` / `AreaChartCard`, `DonutChartCard`, `BarChartCard` do `@/components/bi/charts` (já usados em outras páginas BI).
- `Popover` + `Calendar` shadcn para o datepicker de `data_ref`. Inputs `month` HTML nativos para `anomes_ini/anomes_fim` (ou dois selects Ano/Mês, no padrão do módulo).

## Validações

- Amostra abril/2026 (`data_ref=2026-04-30`): esperar total=427, masc=360, fem=67, JA=24, estag=3, PCD=11.
- Data atual: total ≈ 413.
- Erros de rede → toast e mantém último snapshot em cache.

## Fora de escopo

- Backend/FastAPI (endpoints já prontos).
- Cálculo de headcount, ativo/demitido, empresa customizada no front.
- Novas tabelas no Cloud.
- Alterações em outras páginas RH.
