Remover a linha "Modelo utilizado: … (Configuração oficial da empresa)" do cabeçalho da página **DRE Padrão**.

## Alteração
- **`src/pages/contabilidade/dre-padrao/DrePadraoPage.tsx`** (linhas 30–41): manter apenas o subtítulo `Demonstração do Resultado do Exercício`, removendo o trecho condicional que exibe o nome do modelo e o texto "(Configuração oficial da empresa)".
- Remover também a variável `modeloNome` (não mais utilizada após a limpeza).

Nenhuma outra tela é afetada — o modelo continua sendo resolvido normalmente via `useContabilConfiguracao` para carregar a visualização.