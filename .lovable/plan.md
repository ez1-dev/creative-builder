# Refazer Mapa de Destinos — react-simple-maps com zoom, drill-down e animação

## Objetivo

Substituir o `MapaDestinosCard.tsx` atual por uma versão limpa, com 4 capacidades:

1. **Zoom e pan** (scroll/pinch + arrastar)
2. **Drill-down**: clicar num estado abre painel lateral com cidades daquele estado e filtra o dashboard
3. **Hover + clique para filtrar** (mantém comportamento atual)
4. **Animação de entrada** (fade + scale ao montar)

Mantemos `react-simple-maps` (já instalado, sem novas dependências).

## Estrutura nova do componente

```text
MapaDestinosCard
├── Header
│   ├── Título + líder UF
│   ├── Badge do filtro ativo (UF ou cidade)
│   └── Botões: [Reset zoom] [Limpar filtro]
├── Body (grid 3 colunas)
│   ├── Mapa (col-span-2)
│   │   ├── ComposableMap com ZoomableGroup
│   │   │   ├── Camada 1: Geographies (fills + click + hover)
│   │   │   ├── Camada 2: Geographies (bordas)
│   │   │   └── Camada 3: Markers com siglas UF
│   │   ├── Tooltip flutuante (portal)
│   │   └── Controles de zoom [+] [-] [reset]
│   └── Sidebar
│       ├── Modo padrão: Top 5 cidades + legenda
│       └── Modo drill-down: cidades do estado selecionado
```

## Mudanças técnicas concretas

### 1. Zoom e pan
- Envolver `<Geographies>` em `<ZoomableGroup zoom={zoom} center={center} onMoveEnd={...}>`.
- Estado: `zoom: number`, `center: [number, number]`.
- Botões `+` `-` `reset` controlam o estado.
- Limites: `minZoom={1}` `maxZoom={8}`.

### 2. Drill-down por estado
- Estado novo: `selectedUF: string | null`.
- Click no `<Geography>` → `setSelectedUF(uf)` + `onSelectUF?.(uf)` (nova prop).
- Quando `selectedUF` está ativo:
  - Mapa dá zoom automático nas coordenadas do centroide do estado (com `setZoom(3)` e `setCenter(centroid)`).
  - Outros estados ficam com `opacity: 0.35`.
  - Sidebar troca de "Top 5" para "Cidades em {UF}" listando cidades agregadas.
- Botão "← Voltar" reseta `selectedUF`, zoom e center.

### 3. Animação de entrada
- Container do mapa com `className="animate-fade-in"`.
- Cada `<Geography>` recebe `style={{ transition: 'opacity 200ms, fill 300ms' }}`.
- Markers de UF com `animate-scale-in` aplicado via wrapper SVG.

### 4. Refatoração de qualidade
- Extrair `colorForQtd`, `COD_TO_UF`, `UF_NOME`, `labelOffset` para `src/components/passagens/mapaUtils.ts`.
- Tooltip via portal (`createPortal` no `document.body`) para evitar clipping do Card.
- Remover código duplicado das 3 camadas de `<Geographies>`.

## Integração com o dashboard

A prop `onSelectDestino` continua existindo (filtra por cidade). Adicionar:

- `selectedUF?: string | null`
- `onSelectUF?: (uf: string | null) => void`

No `PassagensDashboard.tsx` (linha ~612) adicionar handler que filtra `data` por `uf_destino` quando `selectedUF` está setado.

## Arquivos afetados

- `src/components/passagens/MapaDestinosCard.tsx` — reescrito
- `src/components/passagens/mapaUtils.ts` — novo (utils extraídos)
- `src/components/passagens/PassagensDashboard.tsx` — adicionar estado `selectedUF` e passar prop

## Não muda

- GeoJSON em `/public/geo/brasil-uf.json`
- Lógica de agregação `porUF` / `porCidade` (continua igual)
- Tabela `passagens_aereas` e queries

## Riscos

- **Zoom + Marker labels**: em zoom alto, siglas pequenas viram poluição visual. Solução: esconder labels quando `zoom > 2` exceto para o UF selecionado.
- **Click vs pan**: `ZoomableGroup` pode capturar clicks como drag. Mitigação: usar `onClick` no `<Geography>` com threshold de movimento (já tratado pela lib).

Aprovando, eu implemento direto.
