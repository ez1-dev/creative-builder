## Objetivo
Adicionar opção de **cor do resultado** (valor numérico do KPI / destaque do widget) no diálogo *Configurar bloco* do BI Comercial, junto com as opções de cor e negrito do título já existentes.

## Escopo
- Apenas BI Comercial (mesmo fluxo já implementado para título).
- Aplicar a KPIs (valor principal). Demais widgets (gráficos/tabelas) ignoram silenciosamente.
- Sem mudanças de backend / lógica de negócio.

## Mudanças

### 1. `src/components/bi/runtime/WidgetTitleStyle.tsx`
- Adicionar prop `valueColor?: string | null` (reaproveita `resolveTitleColor` / `TITLE_COLOR_PRESETS`).
- Quando definida, injetar `--widget-value-color` no mesmo wrapper `data-widget-title-style` (renomeio interno do atributo segue o mesmo — apenas adiciona a var; sem renomear para não quebrar CSS).
- Reexportar `VALUE_COLOR_PRESETS` (alias dos presets atuais) para clareza no dialog.

### 2. `src/index.css`
- Acrescentar regra:
  ```css
  [data-widget-title-style] [data-widget-value] {
    color: var(--widget-value-color, inherit);
  }
  ```

### 3. `src/components/bi/kpis/KpiCard.tsx`
- Adicionar `data-widget-value` na `<div>` que renderiza `formatByKind(value, format)` (linha 69).
- Idem para `KpiStatusCard` (mesmo padrão), se houver valor principal.

### 4. `src/components/bi/runtime/ConfigureBiWidgetDialog.tsx`
- Estender `ConfigureValue` com `valueColor?: string | null`.
- Estado `valueColor` (preset/hex/null) + input custom hex, espelhando o bloco de "Aparência do título".
- Nova seção **"Cor do resultado"** logo abaixo de "Aparência do título" (em ambas as abas built-in e library).
- Incluir `valueColor` em `handleApply`.

### 5. Persistência
- `src/hooks/useComercialLayout.ts`: adicionar `valueColor?: string | null` em `ComercialWidget` e `SaveLayoutItem`; gravar/ler no payload de layout.
- `src/lib/bi/normalize.ts`: incluir `valueColor` no helper de normalização.
- `src/pages/bi/ComercialPage.tsx`:
  - Passar `valueColor` para `<WidgetTitleStyle>` no `blocks` memo.
  - Incluir `valueColor` no `widgetsContentKey` para re-render imediato.
  - `configDraft` já é genérico (`Partial<SaveLayoutItem>`), então o draft unificado funciona sem mudanças adicionais.

## Critérios de aceitação
- No edit mode → "Configurar bloco" de um KPI aparecem 2 grupos: *Aparência do título* (cor + negrito) e *Cor do resultado* (cor + hex custom).
- Selecionar preset ou hex muda imediatamente a cor do número do KPI no preview.
- Botão **Salvar Dashboard** habilita ao alterar a cor (já coberto pelo sistema de drafts unificado).
- Cancelar descarta.

## Fora de escopo
- Cor de séries em gráficos.
- Cor de células de tabela.
- Negrito do resultado (apenas cor, conforme pedido).
