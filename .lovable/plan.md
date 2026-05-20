## Problema

No bloco **Operações** da impressão, os rótulos e valores estão desalinhados (ex.: "0" aparece solto abaixo de "Operação", "60 / 60 / PC" caem na coluna de rótulos). Isso acontece porque o grid `op-kv` é de 2 colunas (rótulo + valor) e itens condicionais (`fornecedor`, `servico`, `proxima_operacao`) deixam células faltando, quebrando o fluxo do grid.

## Solução

Em `src/components/producao/OpPrintSheet.tsx`, reorganizar o bloco de cada operação para um layout estável de **2 colunas de pares rótulo/valor** (4 colunas no grid), com ordem fixa:

```text
Estágio:    [valor]            Centro Rec.:  [valor]
Seq.:       [valor]            Operação:     [valor]
Tmp Unit:   [valor]            Tmp Total:    [valor]
U.M.:       [valor]            Próx. Oper.:  [valor ou —]
Fornecedor: [valor] (linha inteira, só se houver)
Serviço:    [valor] (linha inteira, só se houver)
```

- Sempre renderizar os campos fixos (Estágio, Seq., Centro Rec., Operação, Tmp Unit, Tmp Total, U.M., Próx. Oper.) — usar `—` quando vazio, evitando buracos no grid.
- Fornecedor e Serviço, quando presentes, ocupam linha inteira (`grid-column: 1 / -1`) abaixo dos pares fixos.
- Código de barras continua à esquerda; bloco de pares à direita ocupa `flex: 1`.

## Mudanças

- **`src/components/producao/OpPrintSheet.tsx`**: refatorar somente o JSX dentro de `operacoes.map(...)` — novo grid `op-kv-2col` (4 colunas: 90px 1fr 90px 1fr) substituindo o `op-kv` atual; tornar campos fixos sempre presentes; mover Fornecedor/Serviço para linhas full-width condicionais.
- **`src/components/producao/op-print.css`**: adicionar a classe `.op-sheet .op-kv-2col` com `display: grid; grid-template-columns: 90px 1fr 90px 1fr; column-gap: 6px; row-gap: 2px;` e regra `.op-kv-2col > .full { grid-column: 1 / -1; }`.

## Fora de escopo

- Layout do cabeçalho da OP, componentes, observações e tabela de apontamento manual (permanecem iguais).
- Mudanças em dados/endpoints.
