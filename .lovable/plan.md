
# Plano — Mapa de Calor Brasil no BI Comercial

Reaproveitar todo o trabalho já feito (`BrazilHeatMap`, `BrazilHeatMapWidget`, GeoJSON local, util de intensidade) e plugá-lo no widget `estados` do BI Comercial como **mais uma variante**, mantendo o mesmo dataset (`qEstado` / `mapaData`) e o mesmo cross-filter (`toggleDrill('cd_estado', uf)`) usado pelo cartograma.

## O que muda

### 1. `src/components/bi/maps/BrazilHeatMap.tsx`
- Adicionar prop opcional `selectedUf?: string | null`.
- Quando UF estiver selecionada: `stroke: hsl(var(--ring))`, `strokeWidth: 2`, sem reduzir opacidade; demais estados ficam `opacity: 0.55`. Mantém clique para "togglar".

### 2. `src/lib/bi/comercialWidgetCatalog.ts`
- Em `MAP_VARIANTS`, inserir nova variante após `state-map`:
  ```ts
  { value: 'heatmap', label: 'Mapa de Calor (coroplético)' },
  ```
- Em `libraryComponentIds` do widget `estados`, acrescentar id `'brazil-heatmap'` (apenas para troca via Biblioteca, opcional).

### 3. `src/pages/bi/ComercialPage.tsx` (função `renderEstados`)
- Antes do `if (variant === 'state-map')` adicionar:
  ```tsx
  if (variant === 'heatmap') {
    const selUf = (filters as any)?.cd_estado ?? null;
    return (
      <BrazilHeatMap
        title={title}
        data={mapaData.filter(d => /^[A-Z]{2}$/.test(String(d.uf || '').toUpperCase()))
                      .map(d => ({ uf: String(d.uf).toUpperCase(), valor: d.valor }))}
        selectedUf={selUf}
        valueFormatter={formatCurrency}  // já respeita NumberRoundingToggle global (formatCurrency BI)
        onStateClick={(uf) => toggleDrill('cd_estado', uf)}
      />
    );
  }
  ```
- Importar `BrazilHeatMap` de `@/components/bi/maps/BrazilHeatMap` no topo do arquivo.
- **Não** vamos usar `BrazilHeatMapWidget` aqui — ele refazia o fetch; usar `mapaData` (já em memória, já com filtros aplicados) é mais leve e segue o padrão do cartograma.

### 4. Catálogo de componentes (`BiComponentsDemoPage.tsx`)
- Sem mudanças (a demo já existe).

## Comportamento garantido

- Mapa coroplético geográfico (react-simple-maps + GeoJSON `public/maps/brasil-estados.geojson`).
- Cada UF colorida por intensidade `hsl(var(--primary) / x)`; sem dado = `hsl(var(--muted))`. Sem cor hardcoded.
- Tooltip nativo: "SP - São Paulo: R$ X mi" (`formatCurrency` já segue modo global).
- Legenda horizontal min → max abaixo do mapa.
- Click no estado: `toggleDrill('cd_estado', uf)` → mesmo cross-filter usado pelo cartograma. Clicar de novo na mesma UF remove o filtro (comportamento já implementado em `toggleDrill`).
- Estado selecionado destacado por `selectedUf` (lido de `filters.cd_estado`).
- Filtros do topo (`anomes_*`, `unidade_negocio`, `cliente`, `obra`, `revenda`, `origem`) já são aplicados via `qEstado` — sem nada a fazer.
- Compatível com erro React #310: todos os hooks no topo do `BrazilHeatMap`; nenhum hook em map/callback.

## O que NÃO muda

- Backend: **nenhuma** alteração; reusa `/api/bi/comercial/estado` já consumido.
- Cartograma (`BrazilStateMapWidget`) e mapa em grid (`BrazilMapCard`) continuam disponíveis como variantes.
- Demais widgets, KPIs, drills e grids inalterados.
- Exportação não implementada (fora do escopo, conforme pedido).

## Arquivos

```text
src/components/bi/maps/BrazilHeatMap.tsx        (editar — prop selectedUf)
src/lib/bi/comercialWidgetCatalog.ts            (editar — nova variante)
src/pages/bi/ComercialPage.tsx                  (editar — render variant heatmap)
```

## Validação

- Em `/bi/comercial`, no bloco "Top estados" (widget `estados`), abrir Configurar → selecionar variante "Mapa de Calor (coroplético)". O mapa do Brasil aparece colorido conforme faturamento.
- Clique em SP: chip `Estado: SP` aparece, KPIs/gráficos atualizam, estado SP fica destacado.
- Clique novamente em SP: filtro removido.
- Filtros do topo alteram intensidade/dados em tempo real.
- Sem novo fetch dedicado (reusa `qEstado`).
