## Objetivo

Adicionar um **mapa geográfico real** ao dashboard de Passagens Aéreas, mostrando os destinos como pontos sobre o mapa do Brasil, com tamanho/cor proporcional à quantidade ou valor das viagens. Hoje o widget "mapa-destinos" é apenas um ranking em lista.

## Solução

Criar um novo componente `MapaCidadesViagens` que reusa o GeoJSON do Brasil já presente em `public/geo/brasil-uf.json` e o helper `geocodeCidade` em `src/components/passagens/cidadesBrasil.ts` (já tem lat/lng das capitais).

Library: `react-simple-maps` (já usada em `src/components/bi/charts/maps/BrazilMapCard.tsx`). Para os pontos, usar `<Marker>` da própria lib (sem nova dependência).

### Componente novo: `src/components/passagens/MapaCidadesViagens.tsx`

- Props: `data: Passagem[]`, `selectedDestino?: string[]`, `onSelectDestino?: (cidade: string) => void`.
- Estado interno:
  - `metrica`: `'qtd' | 'valor'` (toggle no header — botões pequenos).
  - Calcula agregado por cidade (mesmo padrão do `MapaDestinosCard`) e também por UF (para colorir os estados).
- Render:
  - `ComposableMap projection="geoMercator"` centrado no Brasil.
  - `<Geographies>` colorindo cada UF por intensidade da métrica selecionada (igual ao `BrazilMapCard`).
  - `<Marker>` para cada cidade com `geocodeCidade(...)` definido. Raio = escala linear baseada na métrica (ex.: `4 + 16 * (valor/maxValor)`). Cidades sem coords são ignoradas (mas listadas no rodapé como "X cidades sem coordenadas").
  - Tooltip via `<title>` no marker: `Cidade · UF — N viagens — R$ X`.
  - Click no marker → `onSelectDestino(cidade)` (cross-filter).
  - Highlight: se `selectedDestino` inclui a cidade, marker com ring/contorno mais grosso.
- Header: toggle "Por valor" / "Por quantidade" + chip mostrando total agregado e n cidades plotadas.
- Legenda inferior pequena: bolha mínima/média/máxima com valores.

### Integração no dashboard

`PassagensDashboard.tsx`:

1. Adicionar um novo widget `'mapa-cidades'` no objeto `blocks` (com `useUserVisuals().canSeeVisual('passagens.mapa-cidades')`).
2. Atualizar `PASSAGENS_DEFAULT_WIDGETS` em `src/hooks/usePassagensLayout.ts` para incluir o widget e ajustar `y` dos seguintes.
3. Atualizar `upsert_passagens_dashboard_default` (migração SQL) para inserir o novo widget na grade default. Reposicionar:
   - kpis-row     y=0  h=3
   - mapa-cidades y=3  h=8 (novo, mapa principal)
   - mapa-destinos y=11 h=7 (lista, agora abaixo)
   - charts-row   y=18 h=12
   - tabela-registros y=30 h=10

   Guardrail: a função já tem `WHERE NOT EXISTS` por type, então só insere se faltar — sem destruir layouts customizados de admins.
4. Cadastrar a chave `passagens.mapa-cidades` em `src/lib/visualCatalog.ts`.

## Sem mudanças em

- Library de mapas (reusa `react-simple-maps`).
- Geocoding (reusa `cidadesBrasil.ts`).
- Backend FastAPI / ETL.

## Resultado

Ao abrir Passagens Aéreas, o usuário vê o mapa do Brasil com:
- Estados sombreados pela métrica escolhida (qtd ou valor).
- Bolhas em cada cidade (das que têm coords no catálogo) com tamanho proporcional.
- Toggle "Por quantidade / Por valor" no canto.
- Click no estado/cidade aplica cross-filter (UF/destino) sincronizado com KPIs, tabela e gráficos.
