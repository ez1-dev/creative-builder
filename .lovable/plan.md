Ocultar o bloco **Filtros salvos** quando `DreStudioVisualizacaoPage` for renderizado dentro da **DRE Padrão** (`modoBloqueado`).

## Alteração
- **`src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`** (linhas 1533–1554): envolver o `<div className="mb-3 rounded-xl border bg-white shadow-sm">` (bloco de Filtros salvos) em `{!modoBloqueado && ( ... )}`, mantendo o restante da tela intacto para o DRE Studio configurável.