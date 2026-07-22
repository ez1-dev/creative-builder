Tornar o painel **Conciliação DRE × Balanço Senior** colapsável, minimizado por padrão.

## Alteração
**`src/components/dre-studio/ConciliacaoDREBalancoPanel.tsx`**
- Adicionar `useState` inicial `open = false` (persistido em `localStorage` chave `dre-vis:conciliacao-open`).
- Transformar o `<div>` do cabeçalho (linha 100) em `<button>` clicável mostrando um chevron (ChevronRight quando fechado / ChevronDown quando aberto).
- Renderizar o conteúdo (erro, "sem dados", tabela) somente quando `open === true`.
- Manter estilos/estrutura atuais; apenas envelopar a seção do corpo com condicional.