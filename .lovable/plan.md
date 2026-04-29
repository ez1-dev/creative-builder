# Mapa de Destinos — Passagens Aéreas

## Objetivo

Adicionar um **mapa do Brasil interativo** ao dashboard de `/passagens-aereas` mostrando as cidades de destino com maior incidência (quantidade de passagens), permitindo identificar visualmente para onde mais se viaja.

## Contexto descoberto

- Coluna `destino` (texto livre, ex: "CURITIBA", "SAO PAULO") está disponível em `passagens_aereas`.
- Apenas **~36 cidades distintas** nos dados atuais — viável manter um dicionário local de coordenadas.
- Top destinos hoje: Curitiba (52), São Paulo (34), Salvador (28), Fortaleza (26), Santarém (25), Manaus (18), Itaituba (17), Belém (14)…
- Dashboard já existe em `src/components/passagens/PassagensDashboard.tsx` e respeita o filtro global da página.

## O que será feito

### 1. Dicionário de coordenadas das cidades brasileiras
Novo arquivo `src/components/passagens/cidadesBrasil.ts` com mapa `{ nome normalizado → { lat, lng, uf } }`:
- Todas as 27 capitais.
- Todas as cidades já presentes no banco (Itaituba, Santarém, Chapecó, Joinville, Cascavel, etc.).
- Função `geocodeCidade(nome)` que normaliza (uppercase, sem acento, trim) e devolve coordenadas, ou `null` se desconhecida.

### 2. Novo componente `MapaDestinosCard`
Arquivo: `src/components/passagens/MapaDestinosCard.tsx`.

- Recebe a lista filtrada de passagens (mesma já calculada no dashboard).
- Agrega por `destino`: `{ cidade, qtd, total_valor, lat, lng }`.
- Renderiza um mapa do Brasil com **bolhas proporcionais** à quantidade de viagens em cada cidade.
- Cores em escala (token `--primary`) — mais escuro = mais incidência. Sem cores hardcoded.
- Tooltip por bolha: cidade, qtd de passagens, valor total formatado em BRL.
- Lista lateral compacta com Top 5 destinos (rank, cidade, qtd, valor) — útil quando o usuário não consegue interagir com o mapa.
- Cidades sem coordenadas conhecidas vão para um aviso discreto: "N cidades sem geolocalização".

### 3. Tecnologia do mapa
Usar **react-simple-maps** + **d3-scale** (já leves, ~50KB) com um GeoJSON do Brasil por estado servido em `public/geo/brasil-uf.json` (arquivo enxuto, ~150KB, baixado de fonte pública confiável e commitado).

Alternativa considerada e rejeitada: leaflet/mapbox (peso maior + chave de API). react-simple-maps roda em SVG puro, combina com o tema claro/escuro via tokens semânticos.

### 4. Integração no dashboard
Em `PassagensDashboard.tsx`:
- Adicionar o `MapaDestinosCard` numa nova linha do grid, depois dos KPIs e antes (ou ao lado) dos gráficos existentes.
- Reutilizar a mesma fonte de dados já filtrada (não refazer fetch).
- Respeitar layout: grid responsivo, `h-full`, alinhado com os outros cards.

### 5. Filtro por clique (bônus leve)
Clicar numa bolha aplica o destino como filtro adicional do dashboard (estado local), com um chip "Destino: CURITIBA ✕" para limpar. Sem persistir no localStorage para manter simples.

## Detalhes técnicos

- Dependências novas: `react-simple-maps`, `d3-scale` (`bun add react-simple-maps d3-scale @types/react-simple-maps @types/d3-scale`).
- GeoJSON: copiar para `public/geo/brasil-uf.json` (UFs do IBGE simplificado).
- Cores via `hsl(var(--primary) / <alpha>)` para integrar ao tema.
- Sem chamadas externas em runtime: tudo é estático.
- Sem alterações de banco/RLS — somente frontend.

## Arquivos afetados

- **Novo**: `src/components/passagens/cidadesBrasil.ts`
- **Novo**: `src/components/passagens/MapaDestinosCard.tsx`
- **Novo**: `public/geo/brasil-uf.json`
- **Editado**: `src/components/passagens/PassagensDashboard.tsx` (montar o card no grid)
- **Editado**: `package.json` (3 deps)

Aprove para eu implementar.
