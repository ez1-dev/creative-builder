## Diagnóstico (confirmado)

No `@media print` há esta regra em `op-print.css`:

```css
.op-main-content,
.operation-block,
.op-operation,
.componentes-page table,   /* ← este aqui */
.op-drawing-content,
.op-sheet table tr {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
```

Com isso, a tabela inteira de componentes é tratada como **um bloco indivisível**. Como a OP 1109 tem ~30 componentes, a tabela não cabe em uma folha A4 → o Chrome empurra para a próxima folha → continua não cabendo → resultado: a última folha sai com o cabeçalho da OP e a tabela some.

## O que vou fazer

Editar apenas `src/components/producao/op-print.css`:

1. **Remover `.componentes-page table` do grupo `page-break-inside: avoid`** — a tabela precisa poder quebrar entre páginas A4.
2. Manter o `page-break-inside: avoid` apenas nas **linhas (`tr`)** da tabela de componentes (já existe via `.componentes-page tr` e `.op-sheet table tr`), garantindo que nenhuma linha seja cortada ao meio.
3. Manter `thead { display: table-header-group }` (já adicionado) para repetir o cabeçalho da tabela em cada folha.

Sem mudanças em `OpPrintSheet.tsx`, API ou lógica.

## Resultado esperado

- Folha de componentes da OP 1109 mostra todas as ~30 linhas, quebrando em quantas folhas A4 forem necessárias.
- Cabeçalho da tabela (Código, Descrição, Qtde., UN, Dep., Endereço) repete a cada folha.
- Linhas não são fatiadas no meio.
- Layout de operações e desenhos permanece intacto.

## Arquivo-alvo

- `src/components/producao/op-print.css`
