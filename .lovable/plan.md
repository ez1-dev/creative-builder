# Bug: "Faturamento — Realizado / Meta / Diferença" usa o mesmo valor nas 3 linhas

## Diagnóstico

O componente `faturamento-realizado-meta-card` declara 3 inputs do tipo `kpis` no registry (`realizado`, `meta`, `diferenca`), mas o diálogo `ConfigureBiWidgetDialog.tsx` mantém **um único estado** `valueKey` e o aplica em **todos** os inputs `source === 'kpis'`:

```ts
inputs.forEach((inp) => {
  if (inp.source === 'kpis') mapping[inp.key] = valueKey || kpiOptions[0]?.key || '';
  ...
});
```

Resultado: ao aplicar o card da Biblioteca BI, `realizado`, `meta` e `diferenca` apontam para a mesma chave (Faturamento Bruto), e o card mostra `R$ 2.095.099` nas três linhas — em vez de Realizado/Meta/Diferença reais como o bloco built-in faz.

O mesmo problema afetaria qualquer componente futuro com >1 input `kpis` ou `series`.

## Plano

### 1. `ConfigureBiWidgetDialog.tsx` — mapeamento por input
- Substituir os estados únicos `seriesKey` / `valueKey` por um único `Record<string, string>` (`inputMapping`) com uma chave por `input.key`.
- Inicializar a partir de `initial.mapping` quando existir; senão, usar `def.kpiKey` para o primeiro `kpis` e os primeiros valores disponíveis do schema para os demais.
- Renderizar **um Select por input** (um para cada input `kpis` ou `series`) com label = `input.label`, em vez dos dois Selects fixos atuais ("Série" e "KPI").
- Em `handleApply` e no `previewNode`, montar o `mapping` lendo `inputMapping[input.key]` para cada input.
- Reset no `useEffect([open])` segue a mesma lógica.

### 2. Pré-seleção inteligente para o card de Faturamento
- Quando `componentId === 'faturamento-realizado-meta-card'` e `initial.mapping` estiver vazio, aplicar o `autoMap` já definido no registry (`faturamento_bruto/liquido`, `meta`, `diferenca`) para que ao abrir o diálogo as três linhas já venham com KPIs distintos sensatos.
- Genérico: se o `libDef.autoMap` existir e não houver mapping inicial, usar `autoMap({ kpis: kpiOptions, series: seriesOptions, rows })` como default.

### 3. Sem mudanças em backend / outros componentes
- Componentes com 1 só input continuam idênticos visualmente (um Select, mesmo label).
- Nenhum impacto em widgets built-in nem nos blocos `custom-*` já salvos com mapping completo.

## Critérios de aceite
- Ao aplicar "Faturamento — Realizado / Meta / Diferença" no bloco "Resumo Faturamento", a pré-visualização mostra 3 valores diferentes (Realizado/Meta/Diferença) já no primeiro abrir do diálogo.
- O usuário pode trocar individualmente qual KPI alimenta cada linha via 3 dropdowns separados.
- Após Aplicar, o card renderizado na página BI exibe os valores corretos (ex.: Realizado ≈ R$ 1.828.517, Meta ≈ R$ 8.328.422, Diferença ≈ −R$ 6.500.000) em vez de repetir o mesmo número.
- Componentes com apenas 1 input KPI/Série continuam funcionando como hoje.
