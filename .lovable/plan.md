## Objetivo

Refatorar `/rh/contrato-experiencia` para consumir o novo payload da API (com `vencidos_pendentes`, `dt_primeiro_vencimento`, `dt_segundo_vencimento`, `dias_vencido`) e adicionar o filtro "Janela de vencidos" (`dias_vencido_max`, padrão 90).

## Alterações

### 1. `src/lib/rh/types.ts`
- `ContratoExperienciaKpis`: adicionar `vencidos_pendentes: number`.
- `ContratoExperienciaVencimento`: substituir `dt_vencimento` por `dt_primeiro_vencimento` + `dt_segundo_vencimento`; adicionar `dias_vencido: number | null`. Manter `dias_restantes` como `number | null`.

### 2. `src/lib/rh/api.ts`
- `fetchContratoExperienciaDashboard(codemp, diasVencidoMax=90)`: aceitar segundo parâmetro, enviar `dias_vencido_max` na querystring, normalizar `vencidos_pendentes` no `kpis` e mapear os novos campos dos vencimentos (`dt_primeiro_vencimento`, `dt_segundo_vencimento`, `dias_vencido`).
- `fetchContratoExperienciaDashboardCached`: repassar `diasVencidoMax` e incluí-lo na cache key (`rh:contratos-exp:${codemp}:${diasVencidoMax}`).
- `exportarContratoExperienciaExcel(codemp, diasVencidoMax=90)`: adicionar `dias_vencido_max` na URL e `access_token` na querystring (em vez de header) — usar `api.getToken()` e navegar via `window.location.href = url` (ou `<a download>` direto) já que o token vai na URL. Manter fallback de filename `rh_03_contrato_experiencia.xlsx`.

### 3. `src/lib/rh/filtros.ts`
- Remover / desativar `filtrarContratosPorPeriodo` para esta página (a janela por AAAAMM não faz mais sentido junto com `dias_vencido_max`). Se ainda for referenciada por relatório PDF, manter função mas não usá-la na página.

### 4. `src/lib/rh/widgetCatalogs.ts`
- Adicionar widget `kpi-vencidos-pendentes` em `CONTRATOS_EXP_DEFAULTS` e `CONTRATOS_EXP_CATALOG`, reorganizar layout dos KPIs (5 cards em `w: 2` cada ou 3+2) e reposicionar `vencimentos` abaixo.

### 5. `src/pages/rh/ContratoExperienciaPage.tsx`
- Remover filtros `ini/fim` (AAAAMM) e o `RhFiltrosBar` de período; manter apenas `codemp`. Adicionar `diasVencidoMax` (state, padrão 90) via `<Select>` com opções 0/30/60/90/120 + help text.
- Adicionar `<Select>` filtro de status (Todos / VENCIDO / A VENCER 5 DIAS / A VENCER 10 DIAS / A VENCER) client-side.
- `useQuery` passa a depender de `[codemp, diasVencidoMax]`.
- Adicionar bloco `kpi-vencidos-pendentes` (variante `danger`, clicável → seta filtro de status para `VENCIDO`).
- Ajustar bloco `vencimentos`:
  - Novas colunas: Matrícula, 1º Vencimento, 2º Vencimento, Dias Restantes, Dias Vencido.
  - Sort client-side: `VENCIDO` primeiro (por `dias_vencido` desc), depois demais por `dias_restantes` asc.
  - Destaque de linha vermelho claro para `status === "VENCIDO"`.
  - Badge de status com cores conforme spec.
  - `formatDateBR` regex `YYYY-MM-DD` → `DD/MM/YYYY` para as três datas.
  - Renderizar `dias_vencido`/`dias_restantes` com `-` quando `null`.
  - Mensagem "Sem contratos para exibir." quando vazio.
- Título `RH - 03 - Contrato de Experiência`.
- Botão Exportar Excel usa o novo `exportarContratoExperienciaExcel(codemp, diasVencidoMax)`.
- Mensagens de erro: 401 → "Sessão expirada. Faça login novamente."; demais → "Não foi possível carregar Contrato de Experiência."

### 6. `src/components/rh/pdf/ModuloPdf.tsx` e `src/lib/rh/relatorio.ts`
- Ajuste mínimo para compilar com o novo shape (renomear referências a `dt_vencimento` → `dt_primeiro_vencimento` no PDF, se existirem). Sem mudança funcional.

## Fora de escopo
- Não alterar endpoints ou lógica no backend.
- Não recalcular status/efetivação no front.
- Não mexer nas outras páginas RH.
