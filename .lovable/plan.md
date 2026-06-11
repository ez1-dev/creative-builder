## Diagnóstico

O card `resumo-faturamento` em `src/pages/bi/ComercialPage.tsx` (linhas 777-814) hoje mostra **4 linhas**: Fat. Bruto, Fat. Líquido, Meta, Diferença — e na turn anterior a Diferença passou a usar Líquido. Está incorreto: as **metas da UpQuery são em Faturamento Bruto**, portanto Realizado/Diferença/% Atingimento devem usar Bruto.

## Mudanças

### 1. `src/pages/bi/ComercialPage.tsx` — bloco `resumo-faturamento` (linhas 777-814)

Reescrever para 3 linhas (Realizado / Meta / Diferença), todas em Bruto, removendo a linha Líquido:

```ts
const title = w.customTitle || w.title || 'Faturamento';
const k: any = kpis;
const realizado = Number(
  k?.realizado ?? k?.faturamento ?? k?.faturamento_bruto ?? k?.fat_bruto ?? 0
);
const meta = Number(k?.meta ?? k?.vl_meta ?? 0);
const diferenca =
  k?.diferenca !== undefined && k?.diferenca !== null
    ? Number(k.diferenca)
    : k?.vl_diferenca !== undefined && k?.vl_diferenca !== null
      ? Number(k.vl_diferenca)
      : realizado - meta;

return (
  <Clickable title="Clique para detalhar" onClick={...}>
    <KpiTriStackCard
      title={title}
      items={[
        { label: 'Realizado', value: realizado, format: 'currency' },
        { label: 'Meta',      value: meta,      format: 'currency' },
        { label: 'Diferença', value: diferenca, format: 'currency' },
      ]}
      headerAction={...}  // (mantém o refresh de metas para admin)
    />
  </Clickable>
);
```

Proibido neste card: `kpis.faturamento_liquido`, `kpis.fat_liquido`, `kpis.diferenca_liquido`. Esses ficam reservados para um card separado de Líquido/Margem.

### 2. Título padrão do widget

Em `src/lib/bi/comercialWidgetCatalog.ts`, garantir que o widget `resumo-faturamento` tenha `title: 'Faturamento'` (ou `'Faturamento x Meta'`). Se já estiver assim, sem mudança. Caso esteja com outro rótulo, atualizar para "Faturamento".

### 3. Gauge `gauge-atingimento` (linhas 815-828)

Já usa `bruto / meta`. **Sem mudanças** — confirmar que continua correto com o padrão Bruto/Meta.

## Fora de escopo

- `FaturamentoRealizadoMetaCard` (componente da Biblioteca BI): permanece genérico — quem define o `realizado` é o builder visual via mapeamento; sem alteração.
- KPIs individuais (`kpi-liquido`, `kpi-bruto`, `kpi-diferenca`): sem alteração — exibem o valor cru da API.
- `% Atingimento de Meta` no `RelatorioBlocos.tsx`/`exportPptx.ts`: já usa Bruto/Meta — sem mudança.
- Backend `/api/bi/comercial/kpis`.

## Arquivos a editar

- `src/pages/bi/ComercialPage.tsx`
- `src/lib/bi/comercialWidgetCatalog.ts` (apenas se o título não estiver como "Faturamento")

## Critério de aceite

- Card "Faturamento" mostra 3 linhas: **Realizado / Meta / Diferença**, todas em Bruto.
- A linha "Fat. Líquido" desaparece deste card.
- Com Realizado (Bruto) = `X` e Meta = `Y`, Diferença = `X − Y` (ou `kpis.diferenca` quando a API retornar).
- Gauge `% Atingimento` continua coerente (Bruto/Meta).
