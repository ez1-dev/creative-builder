## Diagnóstico

A folha de componentes (`.componentes-page`) hoje:
- Tem `overflow: hidden !important` no `@media print` (regra compartilhada com `.op-print-page` e `.op-operation-page`).
- Tem `min-height: 283mm` fixo.

Resultado: quando a lista de componentes ultrapassa uma folha A4, as linhas extras são **cortadas** em vez de continuarem na próxima folha. É exatamente o que aconteceu na OP 1109 (a tabela termina em "PINO MAIOR TERCEIRO PONTO" e os demais componentes somem).

## O que vou fazer

Ajustar **apenas o CSS** (`src/components/producao/op-print.css`) para permitir que a folha de componentes flua por múltiplas páginas A4 quando necessário, mantendo o cabeçalho da tabela repetido em cada página:

1. **Remover `overflow: hidden` da `.componentes-page`** (na tela e no print), preservando o clip nas folhas de operação/desenho.
2. **Trocar `min-height: 283mm` por `min-height: 0` + `height: auto`** no print da `.componentes-page`, para a folha crescer naturalmente.
3. **Garantir que o `<thead>` da tabela de componentes repita em cada página** (`thead { display: table-header-group }` já existe globalmente; vou reforçar com `.componentes-table thead { display: table-header-group }`).
4. **Manter `page-break-inside: avoid` nas linhas (`tr`)** para não fatiar uma linha no meio (já existe).
5. **Manter `page-break-after: always`** entre a folha de componentes e a próxima (desenhos), para a separação continuar correta.

Sem mexer em `OpPrintSheet.tsx`, lógica de negócio, API ou layout das operações.

## Resultado esperado

- Folha de componentes mostra **todos** os componentes, quebrando em quantas folhas A4 forem necessárias.
- Cabeçalho da tabela (Código, Descrição, Qtde., UN, Dep., Endereço) repete em cada folha.
- Cabeçalho da OP (logo "ORDENS DE PRODUÇÃO – GENIUS") permanece **apenas na primeira folha** dos componentes (comportamento atual mantido).
- Folhas de operações e desenhos continuam idênticas.

## Arquivo-alvo

- `src/components/producao/op-print.css`
