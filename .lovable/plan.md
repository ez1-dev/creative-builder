## Objetivo

Na folha de impressão da OP (seção "OPERAÇÃO"), hoje são renderizadas **duas tabelas de apontamento** empilhadas, com colunas duplicadas (Início, Fim, Qtd. Produzida, Refugos, Operador, Check). Deixar apenas **uma única tabela**, sem duplicidade.

## Alteração

Arquivo: `src/components/producao/OpPrintSheet.tsx` (linhas 240–294)

- Remover a primeira tabela (`<table className="op-apontamento-old">`, linhas 240–263), que tem as colunas: Início, Fim, Qtd. Produzida, Refugos, Operador, Check.
- Manter apenas a segunda tabela (`<table className="op-apontamento-table">`, linhas 265–294), que é a mais completa e contém:
  - Início, Fim, Tempo Setup, QTD Produzida, Refugo, Motivo Desvio, Operador, Check, OBS.
- Remover o `style={{ marginTop: 12 }}` da tabela mantida (não há mais nada acima para precisar do espaçamento).
- Opcional: remover a classe CSS órfã `.op-apontamento-old` de `src/components/producao/op-print.css` se existir.

## Fora de escopo

- Layout, fontes, larguras das colunas e quantidade de linhas em branco (mantém 20 linhas como hoje).
- Cabeçalho da operação, código de barras, narrativas e rodapé.
- Comportamento de "quebrar por operação" e o restante do fluxo de impressão.
