## Objetivo

No card **Resumo Faturamento** (`/bi/comercial`), mostrar **Faturamento Bruto** e **Faturamento Líquido** lado a lado com **Meta** e **Diferença**, em vez de apenas "Realizado" (que hoje vem do líquido).

## Mudanças

### 1. `src/components/bi/kpis/KpiTriStackCard.tsx`
- Afrouxar o type `items` de tupla fixa `[TriStackItem, TriStackItem, TriStackItem]` para `TriStackItem[]` (mínimo 1).
- Render já usa `.map`, então funciona com N itens automaticamente. Sem outras mudanças visuais.

### 2. `src/pages/bi/ComercialPage.tsx` — bloco `resumo-faturamento` (linhas 651–690)
Trocar os 3 itens atuais por 4:

```ts
const bruto = Number(k?.faturamento ?? k?.vl_bruto ?? 0);
const liquido = Number(
  k?.faturamento_liquido ?? k?.fat_liquido ?? k?.vl_realizado ?? k?.realizado ?? bruto ?? 0
);
const meta = Number(k?.meta ?? k?.vl_meta ?? 0);
// Diferença continua medindo atingimento da meta — usa o LÍQUIDO (mesma base do gauge/% atingimento)
const diferenca = liquido - meta;

items={[
  { label: 'Fat. Bruto',    value: bruto,     format: 'currency' },
  { label: 'Fat. Líquido',  value: liquido,   format: 'currency' },
  { label: 'Meta',          value: meta,      format: 'currency' },
  { label: 'Diferença',     value: diferenca, format: 'currency' },
]}
```

Diferença permanece `líquido − meta` (consistente com `% Atingimento` que está calculado pelo backend com base no líquido). Se preferir bruto, é só uma linha — me avise antes de implementar.

### 3. Diferença visual
Como agora são 4 valores na mesma altura de card, o texto fica um pouco mais comprimido — `KpiTriStackCard` já usa `justify-around` e `leading-tight`, então não há quebra de layout. Sem mudança de CSS.

## Fora de escopo
- Backend / API: não mexer. Os campos `faturamento` (bruto) e `faturamento_liquido` (líquido) já vêm de `/api/bi/comercial/kpis`.
- Outros widgets (`gauge-atingimento`, `kpi-meta`, etc.) — sem mudança.
- Renomear o componente (`TriStack` deixa de ser literalmente "tri", mas mantemos o nome para não impactar imports em outras telas).
