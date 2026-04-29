# Tornar o Mapa de Destinos responsivo e simétrico aos outros cards

## Problema

Hoje o `MapaDestinosCard` ocupa a linha inteira (`lg:col-span-2`) e fica fora do grid 2-colunas usado pelos demais gráficos (Evolução Mensal, Por Motivo). Ele também fixa a divisão interna em `lg:grid-cols-3` (mapa + Top 5 lado a lado em desktop), o que aperta o mapa quando o card está numa metade da tela.

## Objetivo

Encaixar o mapa no mesmo grid de gráficos `grid-cols-1 lg:grid-cols-2`, ficando do lado da Evolução Mensal, com a mesma altura (`h-full`) e mesmo comportamento responsivo (1 coluna no mobile, 2 colunas em desktop).

## Mudanças

### 1. `MapaDestinosCard.tsx`
- Trocar `Card className="lg:col-span-2"` por `Card className="flex h-full flex-col"` para o card crescer junto com o irmão na linha.
- `CardContent` recebe `flex-1` para o conteúdo preencher a altura.
- Substituir o grid interno por `grid-cols-1 sm:grid-cols-5`:
  - Mapa: `sm:col-span-3`
  - Top 5: `sm:col-span-2`
- O mapa em si já é fluido (`width: 100%, height: auto` + `viewBox` do `ComposableMap`), só precisa do contêiner não forçar largura.
- Encurtar textos do header para caber em coluna estreita ("Maior:" no lugar de "Maior incidência:" e badge "N sem geo").

### 2. `PassagensDashboard.tsx`
- Remover o wrapper dedicado `<div className="grid grid-cols-1 gap-4">` que envolve o `MapaDestinosCard`.
- Mover o `MapaDestinosCard` para dentro do mesmo `<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">` que já contém os outros cards, como **primeiro filho** (fica ao lado de "Evolução Mensal").
- Ordem final do grid: Mapa → Evolução Mensal → Por Motivo → Top Centros de Custo (mantém `lg:col-span-2`).

## Resultado

- Desktop: linha 1 = Mapa | Evolução Mensal · linha 2 = Por Motivo | (próximo card) · linha 3 = Top CCs full-width.
- Mobile/tablet: tudo empilha em 1 coluna, mapa no topo, Top 5 abaixo do próprio mapa.
- Todos os cards da mesma linha com altura igual via `h-full`.

## Arquivos afetados

- `src/components/passagens/MapaDestinosCard.tsx`
- `src/components/passagens/PassagensDashboard.tsx`

Aprove para aplicar.
