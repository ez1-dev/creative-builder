## Objetivo
Na folha de impressão de Ordem de Produção (`OpPrintSheet`), dar mais destaque visual a três campos críticos para o operador de chão de fábrica:

1. **Qtde.** no cabeçalho da OP
2. **Operação** (código + descrição) em cada bloco de operação
3. **Próx. Oper.** (próxima operação) em cada bloco de operação

## Mudanças

### 1. `src/components/producao/OpPrintSheet.tsx`
- Adicionar classe `op-qtde-destaque` na linha do `Qtde.` (label `k` + valor `v`) dentro do `op-header-data`.
- Adicionar classe `op-operacao-destaque` no par label/valor de **Operação** dentro do `op-kv-2col` do `renderOperacao`.
- Adicionar classe `op-proxoper-destaque` no par label/valor de **Próx. Oper.** dentro do mesmo grid.

### 2. `src/components/producao/op-print.css`
Criar três regras novas (mantendo o estilo monocromático preto/branco do MCAP700.GER, sem cor):

- `.op-qtde-destaque .k`, `.op-qtde-destaque .v`: fonte maior (~14px), bold, e fundo cinza muito claro (`#eee`) com borda preta fina para o valor, para chamar atenção.
- `.op-operacao-destaque .k`, `.op-operacao-destaque .v`: fonte maior (~12px), bold, com fundo `#eee` no valor.
- `.op-proxoper-destaque .k`, `.op-proxoper-destaque .v`: mesmo tratamento de "Operação", garantindo paridade visual entre operação atual e próxima.
- Replicar os tamanhos/peso em `@media print` para que o destaque saia também no papel (sem depender de background na impressão — usar borda mais grossa em vez de cinza, já que impressoras podem não imprimir fundos).

### Restrições
- Apenas mudanças visuais (CSS + classes). Sem alterar dados, layout grid principal, paginação ou lógica de impressão.
- Não mexer em tokens shadcn — esta folha é intencionalmente monocromática (preto sobre branco) por ser layout fiel ao Senior.
- Sem novas dependências.

## Fora de escopo
- Reorganização do grid de cabeçalho.
- Alteração do código de barras ou outras células do cabeçalho.
- Mudanças no PDF / outras telas.
