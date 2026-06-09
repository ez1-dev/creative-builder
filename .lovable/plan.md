
# Plano — Mapa de calor coroplético do Brasil (BI Comercial)

Criar um componente novo de mapa **geográfico real** do Brasil por UF, lado a lado com o cartograma atual (`BrazilStateMapWidget`), sem alterá-lo. Já plugar nos dados reais existentes (`fetchComercialEstado`) e disponibilizar uma demo na página `/bi-components` (BiComponentsDemoPage).

## O que será entregue

1. **GeoJSON local** dos estados do Brasil em `public/maps/brasil-estados.geojson`, com `properties.sigla` (UF) garantido. Baixado de fonte pública confiável (IBGE-derived, ex.: `codeforgermany/click_that_hood` ou repositório IBGE), e normalizado se necessário (script único, não recorrente).
   - Carregamento on-demand via `fetch('/maps/brasil-estados.geojson')` com cache via TanStack Query (`staleTime: Infinity`), evitando peso no bundle JS.

2. **Dependência nova**: `react-simple-maps` (+ types). Leve, SVG, sem dependência de tiles.

3. **Componente puro visual** `src/components/bi/maps/BrazilHeatMap.tsx`:
   ```ts
   type BrazilHeatMapDatum = { uf: string; valor: number; label?: string };
   type BrazilHeatMapProps = {
     data: BrazilHeatMapDatum[];
     title?: string;
     subtitle?: string;
     height?: number;
     loading?: boolean;
     error?: string | null;
     valueFormatter?: (v: number) => string;   // default formatCurrency
     colorVar?: string;                         // default '--primary'
     onStateClick?: (uf: string, datum?: BrazilHeatMapDatum) => void;
     showLegend?: boolean;                      // default true
   };
   ```
   - Usa `ChartCardShell` (mesmo padrão dos outros widgets BI) para estados loading/empty/error.
   - Carrega GeoJSON internamente via `useQuery(['geo-brasil-uf'], …)`.
   - Cor por intensidade `hsl(var(--primary) / X)` com `X = max(0.12, valor/maxValor)`; sem dado = `hsl(var(--muted))`. Token semântico, **sem hardcode**.
   - Tooltip nativo (`<title>` + estado hover) mostrando `UF - Nome (formatEstadoLabel)` e valor formatado. Sem libs extras de tooltip.
   - Legenda horizontal (gradient + min/max), reutilizando o padrão visual já presente em `BrazilStateMapWidget`.
   - Click chama `onStateClick(uf, datum)` apenas quando há dado.
   - Responsivo: `ComposableMap` com `projection="geoMercator"` ajustado ao bounding box do Brasil, `ResponsiveContainer`-style via `width:100%` + `viewBox`.

4. **Util de cor** em `src/lib/bi/mapUtils.ts`:
   - `getHeatIntensity(valor, min, max)` → número 0.12..1.
   - `buildUfValueMap(data)` → `Map<UF, datum>`.
   - Reaproveita `formatEstadoLabel`/`ufName` de `src/lib/bi/ufLabels.ts`.

5. **Widget plugado em dados reais** `src/components/bi/comercial/BrazilHeatMapWidget.tsx`:
   - Mesma assinatura de filtros que `BrazilStateMapWidget` (`BiComercialFilters`).
   - Usa `fetchComercialEstado(filters)` + normalizador já existente para extrair `{ uf, valor }`.
   - Passa para `<BrazilHeatMap />`.
   - **Não substitui** o widget cartograma — fica disponível para uso opcional em páginas/blocos futuros.

6. **Demo** em `src/pages/BiComponentsDemoPage.tsx`: nova seção "Mapa coroplético do Brasil (novo)" mostrando o `BrazilHeatMap` com dados mock + uma instância do `BrazilHeatMapWidget` (real) lado a lado para comparação com o cartograma atual.

## O que NÃO muda

- `BrazilStateMapWidget` e `BrazilMapCard` continuam intactos.
- BI Comercial (`/bi/comercial`) **não** é alterado — nenhuma troca de widget em produção.
- Sem alteração de backend; usa endpoint `/api/bi/comercial/estado` já existente.
- Sem nova rota; aproveita `/bi-components` (página de demo já existente).

## Detalhes técnicos

- **Projeção**: `geoMercator().center([-54, -14]).scale(700)` (ajustada empiricamente para caber o Brasil em 16:9; revalidada na demo).
- **Acessibilidade**: cada `<Geography>` recebe `aria-label="SP - São Paulo: R$ X"` e `role="button"` quando `onStateClick` existe.
- **Performance**: GeoJSON ~250 KB; servido de `/public` com cache HTTP do Vite/preview; parseado uma vez por sessão via TanStack Query.
- **Tokens**: cor base configurável por `colorVar` (default `--primary`), cinza via `--muted`, borda `--border`. Sem `text-white`/`bg-black`.

## Arquivos

```text
public/maps/brasil-estados.geojson                       (novo)
src/components/bi/maps/BrazilHeatMap.tsx                 (novo)
src/components/bi/comercial/BrazilHeatMapWidget.tsx      (novo)
src/lib/bi/mapUtils.ts                                   (novo)
src/pages/BiComponentsDemoPage.tsx                       (editar — adicionar seção demo)
package.json                                             (add react-simple-maps + @types)
```

## Validação

- Demo `/bi-components` mostra o mapa colorido por intensidade, tooltip nativo no hover, click logando UF no console.
- Loading/empty/error visíveis (forçar via filtros sem retorno).
- Sem hardcode de cor; alternar dark/light mantém contraste correto.
- Cartograma original continua funcionando em `/bi/comercial`.
