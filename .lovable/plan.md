## Plano

Adicionar modo **tela cheia** ao painel *Mapa de Acessos* (Configurações › Acessos › Mapa de Acessos).

1. Em `src/components/configuracoes/MapaAcessosPanel.tsx`:
   - Adicionar estado `expanded` e um botão **"Expandir"** (ícone `Maximize2`) no header do painel, ao lado do botão de exportar XLSX.
   - Quando `expanded = true`, envolver o conteúdo do painel num container `fixed inset-0 z-50 bg-background overflow-auto p-4`, exibindo botão **"Fechar"** (ícone `Minimize2`/`X`) no topo direito. Suportar tecla `Esc` para sair.
   - No modo expandido, aumentar a altura da matriz (usa toda a viewport) e manter filtros/toggles fixos no topo.
   - Preservar toda a lógica existente (filtros, busca, categorias, exportação, tooltips, indicador de override).

## Detalhes técnicos

- Arquivo único alterado: `src/components/configuracoes/MapaAcessosPanel.tsx`.
- Reutilizar tokens do design system (bg-background, border, muted-foreground) — sem cores hardcoded.
- Sem mudanças em backend, rotas ou banco.
