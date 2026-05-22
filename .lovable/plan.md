## Diagnóstico do PDF enviado

Analisei o arquivo `Adorável.pdf` (9 páginas, gerado pelo Chrome) com `pdftotext` e visualmente. Sequência real impressa hoje, em modo "Quebrar por operação" + "Imprimir desenhos":

```text
P1  OP 21264 – cabeçalho (sem operação visível, só topo)
P2  OP 21264 – operação 2175 + apontamento
P3  OP 21264 – cabeçalho + RELAÇÃO DE COMPONENTES (5 itens)
P4  OP 21264 – desenho técnico
P5  OP 21263 – cabeçalho (sem operação)
P6  OP 21263 – operação 2175 + apontamento
P7  OP 21263 – cabeçalho + RELAÇÃO DE COMPONENTES (8 itens)
P8  OP 21263 – desenho técnico
P9  Página totalmente em branco
```

Problemas confirmados:

1. **Cabeçalho sozinho na P1/P5.** O bloco da operação está com `page-break-inside: avoid` e o `op-sheet` está com `min-height: 283mm` no print, mas a soma cabeçalho+operação (com 6 linhas de apontamento) está estourando 1 página A4 → o navegador joga a operação para a página seguinte e deixa o cabeçalho sozinho.
2. **Página em branco final (P9).** Causada pelo combo `page-break-after: always` aplicado ao último `.op-drawing-page` somado a `.op-print-page:last-child` (envólucro do batch) também forçar quebra. O `:last-child` só desliga a quebra do drawing-page se ele realmente for o último filho do batch — mas no batch ele é filho de `.op-print-page`, então a regra não casa.
3. Componentes da OP 125 (mencionada antes) já não somem porque a condição `componentes.length > 0` está aplicada, mas a regra precisa continuar válida nos dois fluxos (Visualizar selecionadas e Imprimir visualização) — confirmado: ambos passam por `OpPrintBatch` → `OpPrintSheet`, então a mesma correção atende.

## O que vou mudar

Tudo continua no front, sem tocar API nem na busca individual nem na lógica dos desenhos.

### 1. `src/components/producao/OpPrintSheet.tsx`

Reorganizar o bloco `if (quebrarPorOperacao)` para:

- Reduzir a altura mínima da página da operação no modo "uma página por operação" (`operation-single-page` deixa de forçar `min-height: 283mm`), mantendo `page-break-after: always` apenas no contêiner. Assim o cabeçalho + operação cabem na mesma folha.
- Garantir a ordem fixa:
  1. para cada operação → `op-sheet op-operation-page` com cabeçalho + bloco da operação;
  2. se houver componentes (>0) → `renderComponentesPage()` uma única vez;
  3. se houver desenhos (>0 / paginasDesenhosA4) → `renderDesenhos('drw-end')` uma única vez.
- Manter `componentes.length > 0 && renderComponentesPage()` (já correto) e nunca renderizar componentes dentro de `renderOperacao`.

### 2. `src/components/producao/op-print.css`

- Em `@media print`, baixar `min-height` de `.op-operation-page` para `auto` (ou `≤ 270mm`) para que cabeçalho + operação caibam juntos. Manter `page-break-after: always` e `page-break-inside: avoid` no bloco `.op-operation` removido (deixar a página inteira como unidade — sem forçar `avoid` interno que empurra para a próxima folha).
- Ajustar `.op-drawing-page:last-child` para também perder `page-break-after` quando estiver dentro de um `.op-print-page:last-child` (usar seletor `.op-print-page:last-child .op-drawing-page:last-child`). Mesma coisa para `.componentes-page:last-child` quando estiver no último `.op-print-page`.
- Remover/relaxar a regra global `page-break-after: always !important` aplicada ao `.op-print-page` quando ele é o último filho do `.op-print-batch` (atualmente o `:last-child` está, mas o `!important` da regra anterior na mesma cascata vence pela ordem; vou reescrever as duas regras como uma só usando `:not(:last-child)` para a quebra forçada).

### 3. `src/components/producao/OpPrintBatch.tsx`

- Sem mudança estrutural. Só garantir que continue passando `quebrarPorOperacao` para cada `OpPrintSheet` (já passa). Vou apenas remover o invólucro extra `.op-print-page` quando `quebrarPorOperacao = true`, porque nesse modo cada `op-sheet op-operation-page` já é uma página, e a casca extra é o que está somando a "página fantasma" do fim.

## Resultado esperado

PDF final em lote, "Quebrar por operação = S" + "Imprimir desenhos = S":

```text
P1 OP 21264 – cabeçalho + operação + apontamento
P2 OP 21264 – cabeçalho + componentes (5 itens)
P3 OP 21264 – desenho técnico
P4 OP 21263 – cabeçalho + operação + apontamento
P5 OP 21263 – cabeçalho + componentes (8 itens)
P6 OP 21263 – desenho técnico
```

Regras mantidas em todos os fluxos (clique individual, Visualizar selecionadas, Imprimir visualização):

- Componentes nunca duplicam dentro de cada operação.
- Componentes nunca somem (mesmo com ≤ 7 itens).
- Ordem fixa: operação → componentes → desenhos.
- Sem páginas em branco no final.
- API, busca individual, cabeçalho, apontamento e modo padrão (sem quebra por operação) ficam inalterados.

## Validação

Após implementar, vou rodar `window.print()` no preview pela rota `/producao/impressao-op` com as duas OPs do PDF (220/21264 e 220/21263) selecionadas e conferir o número de páginas e a sequência. Se ainda houver folha extra, ajusto o CSS de quebra.
