## Objetivo

Remover o **mapa visual do Brasil** do card "Mapa de destinos" e manter **apenas a lista "Top destinos por valor"** (com seu cross-filter por cidade já existente). O componente passa a ser um card compacto e focado, sem mapa interativo, sem zoom, sem heatmap por UF.

## Análise

O componente `MapaDestinosCard` hoje combina:
- **Mapa SVG do Brasil** (`react-simple-maps`) com heatmap por UF, markers de cidades, tooltips, zoom e seleção de UF.
- **Painel lateral "Top destinos por valor"** com lista clicável que filtra `selectedDestino` no dashboard.
- **Modo "drill por UF"** que substitui o Top Destinos pela lista de cidades daquela UF.

Como o usuário quer **remover o mapa e manter só o Top Destinos**, a forma mais limpa é reescrever o `MapaDestinosCard` para renderizar apenas a lista, descartando todo o estado/lógica do mapa (zoom, UF selecionada interna, tooltip, geocoding, geo URL etc.).

A interação por UF deixa de existir junto com o mapa — nenhum outro componente do dashboard dispara `selectedUF` (verificado: o filtro UF é definido apenas dentro do MapaDestinosCard). Isso simplifica também o `PassagensDashboard` que não precisará mais passar `selectedUF`/`onSelectUF`.

## Mudanças

### 1. Reescrever `src/components/passagens/MapaDestinosCard.tsx`

Reduzir o componente para um card simples com:
- Header: ícone + título "Top destinos por valor" + contador "N de M".
- Lista do **Top 5** (com botões "Mostrar mais" / "Mostrar menos" idênticos aos atuais).
- Cada item: rank (1, 2, 3…), cidade, UF · qtd passagens, badge com total formatado.
- Click no item → `onSelectDestino(cidade)` (toggle).
- Seleção visual: borda/bg `primary` quando ativo, igual ao atual.

Remover por completo:
- Imports `react-simple-maps`, `d3-geo`, `createPortal`.
- Imports de `mapaUtils` (heatmap, GEO_URL).
- Estado de zoom/center/tooltip.
- Toda a JSX do `<ComposableMap>` e suas geographies/markers.
- Modo "drill por UF" (lista de cidades de uma UF) — sem mapa não há como ativar UF.
- Props `selectedUF` / `onSelectUF` da interface (não usadas mais).

Manter:
- Cálculo de `porCidade` ordenado por `total` desc.
- Estado `topLimit` para paginação visual.
- `selectedDestino` / `onSelectDestino` (cross-filter principal).

### 2. Ajustar `src/components/passagens/PassagensDashboard.tsx`

Linhas 637-647:
- Manter o `<VisualGate visualKey="passagens.mapa-destinos">` (compatibilidade com perfis que já têm essa chave).
- Remover `selectedUF` e `onSelectUF` da chamada do componente.
- Ajustar grid se necessário (já é `grid-cols-1`, fica igual).

Verificar se `selectedUF` ainda é usado em algum cross-filter no resto do arquivo. Se sim:
- Como o filtro por UF deixa de poder ser definido pelo usuário, **manter o estado** apenas se já houver dados públicos/persistidos que dependam dele; senão remover. (decisão na implementação após `grep selectedUF`).

### 3. Limpeza opcional

Se após a remoção `mapaUtils.ts` e os imports relacionados ficarem totalmente sem uso, deixar os arquivos no projeto (não remover) para evitar quebras em testes/imports indiretos. O bundler vai tree-shake automaticamente.

## Comportamento final

- Card mostra somente a lista "Top destinos por valor" com Top 5 expansível.
- Clique numa cidade aplica o cross-filter normal (gráficos, KPIs, lista de registros reagem).
- Sem mapa, sem heatmap, sem seleção por UF.
- Sem mudança em outras chaves do `visualCatalog` nem nos exports.

## Arquivos afetados

- `src/components/passagens/MapaDestinosCard.tsx` (reescrita)
- `src/components/passagens/PassagensDashboard.tsx` (ajuste de props)
