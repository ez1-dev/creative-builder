## Objetivo
No diálogo **Configurar bloco** do BI Comercial (Editar dashboard), adicionar dois ajustes de aparência do **título** do widget:

1. **Cor da fonte do título** — seletor de cor (presets do design system + custom hex).
2. **Negrito** — toggle on/off.

Aplica-se aos dois modos do diálogo (Variante padrão e Biblioteca BI) e a todos os tipos de bloco renderizados em `ComercialPage` (KPIs, gráficos, tabelas, mapa e componentes da Biblioteca BI).

## Mudanças

### 1. `src/components/bi/runtime/ConfigureBiWidgetDialog.tsx`
- Adicionar estado `titleColor` (string preset key | hex | `null`) e `titleBold` (boolean), inicializados a partir de `initial.titleColor` / `initial.titleBold`.
- Renderizar nova seção compartilhada **"Aparência do título"** (logo abaixo do campo Título, visível em ambas as abas "Variante padrão" e "Biblioteca BI"):
  - **Cor**: swatch com presets semânticos (`default`, `primary`, `success`, `warning`, `destructive`, `muted`) + input para hex custom (`#RRGGBB`).
  - **Negrito**: `Switch` com label "Título em negrito".
- Em `handleApply`, incluir `titleColor` e `titleBold` no objeto enviado a `onApply` (campos top-level no `ConfigureValue`, `null` quando default).
- Estender `ConfigureValue` com `titleColor?: string | null; titleBold?: boolean | null`.

### 2. `src/lib/bi/normalize.ts` e `src/hooks/useComercialLayout.ts`
- Adicionar `titleColor` e `titleBold` ao tipo `ComercialWidget` e à normalização, persistindo no layout (mesmo padrão de `customTitle`).
- Em `useComercialLayout.applyWidgetConfig`, gravar/remover esses campos via `setOrDel` (igual `customTitle`).

### 3. `src/pages/bi/ComercialPage.tsx`
- No `blocks = useMemo(...)`, envolver o `renderWidget(w)` com um wrapper:
  ```tsx
  <WidgetTitleStyle color={w.titleColor} bold={w.titleBold}>
    {renderWidget(w)}
  </WidgetTitleStyle>
  ```
- Incluir `w.titleColor` e `w.titleBold` na `widgetsContentKey` para que mudanças refletam.
- Passar `titleColor`/`titleBold` para o `ConfigureBiWidgetDialog` via `initial`.
- Propagar no `onApply` que persiste mudanças (linhas ~534 e ~706).

### 4. `src/components/bi/runtime/WidgetTitleStyle.tsx` (novo)
Componente pequeno que renderiza um `<div>` com:
- `style={{ '--widget-title-color': resolved }}` quando há cor.
- classe `widget-title-bold` quando `bold === true`.
- Resolve preset → token HSL (ex.: `success` → `hsl(var(--success))`); aceita hex como-is.

### 5. `src/index.css`
Adicionar regras escopadas (não impactam widgets sem estilo aplicado):
```css
[data-widget-title-style] :is(.card-title, [data-slot="card-title"], h3, .text-lg.font-semibold) {
  color: var(--widget-title-color, inherit);
}
[data-widget-title-style].widget-title-bold :is(.card-title, [data-slot="card-title"], h3, .text-lg.font-semibold) {
  font-weight: 700;
}
```
Seletor cobre `CardTitle` (shadcn) e variações usadas pelos KPI cards.

## Fora de escopo
- Cor/negrito do valor numérico do KPI ou de outros elementos (apenas título).
- Persistência por usuário diferente do existente (continua no mesmo layout do dashboard).
- Aplicar em outros dashboards (Passagens, Frota etc.) — só BI Comercial.