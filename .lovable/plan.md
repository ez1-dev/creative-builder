Adicionar setas ← / → na barra de edição de blocos do grid.

**Arquivo:** `src/components/passagens/PassagensLayoutGrid.tsx`

1. Criar `moveCol(type, dir: -1 | 1)` espelhando `moveRow`:
   - Filtra widgets com sobreposição vertical (mesma faixa Y) ao bloco atual.
   - Pega vizinho mais próximo à esquerda (dir=-1) ou direita (+1).
   - Troca o X dos dois blocos e emite o layout.
2. Adicionar dois botões no grupo "Mover bloco" usando `ArrowLeft` / `ArrowRight` (lucide-react), com tooltips "Mover para a esquerda/direita (troca com o bloco ao lado)".
3. Ordem visual final: `← → ↑ ↓`.

Sem mudanças em atalhos de teclado ou outros módulos — o grid é compartilhado, então funciona em Frota, BI Comercial, Máquinas, Passagens etc.