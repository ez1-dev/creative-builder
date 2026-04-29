## Mapa de Destinos: heatmap por estado + centralização

Substituir os marcadores circulares atuais por um **mapa coroplético** (estados pintados por intensidade) e centralizar o mapa no card, conforme o exemplo enviado.

### Comportamento alvo

- Estados do Brasil pintados em escala de cor por **quantidade de passagens** com destino em cidades daquela UF.
- Faixas discretas (estilo do exemplo): cinza (sem registros) → verde claro (baixo) → azul claro (médio-baixo) → amarelo (médio-alto) → vermelho (alto).
- Sigla da UF sobreposta no centroide de cada estado, com pequenos offsets para os estados pequenos do Nordeste (RN, PB, PE, AL, SE) ligados por linha fina, igual ao exemplo.
- Tooltip ao passar o mouse: nome do estado, total de passagens, valor agregado. Mostra "Sem registros" para UFs sem dados.
- Mapa centralizado horizontalmente dentro de sua coluna (`max-width` + `mx-auto`), sem mais espaço em branco assimétrico à esquerda/direita.
- Sidebar continua exibindo **Top 5 destinos** (cidades) e ganha uma **legenda da escala de cores**.
- Card mantém `lg:col-span-2` no grid externo (ocupa as duas colunas como hoje).

### Mudanças técnicas (`src/components/passagens/MapaDestinosCard.tsx`)

1. **Agregação por UF**: além do agregado por cidade (já existe via `geocodeCidade`), construir `Map<uf, { qtd, total }>` somando todas as cidades de cada estado.
2. **Mapa código IBGE → sigla UF**: o GeoJSON em `public/geo/brasil-uf.json` traz apenas `properties.codarea` (ex.: `"35"`). Adicionar tabela estática `COD_TO_UF` cobrindo as 27 UFs.
3. **Função `colorForQtd(qtd, max)`**: retorna HSL discreta em 5 faixas conforme `ratio = qtd/max`.
4. **Camadas SVG** (mantém abordagem de múltiplos `<Geographies>` para evitar bordas cobertas):
   - Camada 1: `fill` por intensidade + handlers de tooltip nos estados (substitui os markers).
   - Camada 2: bordas finas por cima.
   - Camada 3: `<text>` com a sigla, posicionado via `geoCentroid(geo)` do `d3-geo` (já é dependência transitiva do `react-simple-maps`). Texto com `paintOrder: stroke` branco para legibilidade sobre cores fortes. Offsets manuais para RN/PB/PE/AL/SE/ES com linha guia fina.
5. **Centralização**: envolver `<ComposableMap>` em `<div className="w-full max-w-[560px] mx-auto">` e o container externo em `flex items-center justify-center`. Ajustar `projectionConfig` para `{ scale: 780, center: [-54, -15] }` para enquadrar o Brasil sem corte.
6. **Remover** os `<Marker>` com `circle` e a escala `scaleSqrt` (não são mais necessários — a intensidade do estado já comunica).
7. **Legenda**: novo bloco abaixo do Top 5 com 5 swatches (Sem registros / Baixo / Médio / Médio-alto / Alto) usando as mesmas cores da escala.
8. **Header**: "Maior incidência" passa a referenciar o **estado líder** (não mais a cidade), coerente com o heatmap.

### Não muda

- Grid externo do dashboard (`lg:col-span-2`).
- Filtro `selectedDestino` por cidade continua funcionando via Top 5 (clicar na lista).
- `cidadesBrasil.ts` permanece como está.
- `/public/geo/brasil-uf.json` permanece como está.

### QA visual

Após aplicar, validar no preview que:
- Mapa está visualmente centralizado no card.
- Cores variam claramente entre os estados com mais e menos registros (ex.: SP e PA fortes; RS/PR médios; estados sem dados em cinza).
- Siglas legíveis em todos os estados, sem sobreposição entre RN/PB/PE/AL/SE.
- Tooltip aparece corretamente sobre cada UF.
