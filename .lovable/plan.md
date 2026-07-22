Ocultar os botões **Histórico** e **Configurar modelo** na DRE Padrão (`modoBloqueado`).

## Alteração
**`src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`** (linhas 2166–2181):
- Envolver o botão **Histórico** (linhas 2166–2169) em `{!modoBloqueado && ( ... )}`.
- Remover o bloco do botão **Configurar modelo** (linhas 2176–2181), já que só aparece em `modoBloqueado`.

Modo configurável (DRE Studio) continua exibindo Histórico normalmente.