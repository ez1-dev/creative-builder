## Problema confirmado

No modo `quebrarPorOperacao = true`, hoje cada operação gera:

1. Uma folha `op-operation-page` com cabeçalho + bloco da operação (apontamento).
2. Uma folha separada `componentes-page` com cabeçalho + tabela de componentes (mesmo com 5 itens).
3. Folhas de desenho.

A OP 21264 tem só 5 componentes — eles cabem tranquilamente na mesma folha da operação. Hoje saem em folha separada, gerando 1 página a mais por OP e o efeito “cabeçalho repetido” da imagem 88.

## O que vou mudar

Apenas frontend. Sem mexer em API, busca individual, lógica de desenhos ou cabeçalho.

### 1. `src/components/producao/OpPrintSheet.tsx` (bloco `if (quebrarPorOperacao)`)

- Para **cada operação**, renderizar uma única `op-sheet op-operation-page` contendo, nesta ordem:
  1. `renderHeader()` (cabeçalho topo).
  2. `op-section-title "Operação"` + `renderOperacao(op, i)`.
  3. **Se houver componentes e for a primeira operação**: `renderComponentesInline()` logo abaixo da operação, sem repetir cabeçalho. Reaproveita a tabela atual de `renderComponentesPage()`, só sem o wrapper `componentes-page` e sem `renderHeader()`.
  4. `renderFooter()`.
- Componentes saem **uma única vez**, junto da primeira operação (mantém regra antiga de não duplicar).
- Remover a linha `{componentes.length > 0 && renderComponentesPage()}` que hoje cria a folha separada.
- Manter `{desenhos.length > 0 && renderDesenhos('drw-end')}` — desenhos continuam em folhas próprias (A4 dedicado por imagem).
- Se a operação + tabela de componentes estourar a página A4 (ex.: muitas linhas de apontamento + >15 componentes), o CSS permite quebra natural (`page-break-inside: auto`), então o navegador joga só o excedente para a próxima folha — sem cabeçalho órfão.

### 2. `src/components/producao/op-print.css`

- Adicionar regra para `.op-operation-page .componentes-inline` (novo bloco): mesmo estilo visual da tabela atual `componentes-page`, mas sem `min-height: 283mm` e sem `page-break-before`.
- Garantir que `.op-operation-page` siga com `page-break-after: always` somente em `:not(:last-child)` (já está) e `page-break-inside: auto` para deixar o navegador acomodar.

### 3. Sem alteração em `OpPrintBatch.tsx`

Já passa `quebrarPorOperacao` corretamente. Fluxos “Visualizar selecionadas”, “Imprimir visualização” e impressão individual passam pelo mesmo componente, então a regra vale para os três.

## Resultado esperado

Para a OP 21264 (5 componentes) + desenhos:

```text
P1  OP 21264 – cabeçalho + operação + apontamento + tabela de componentes
P2  OP 21264 – desenho técnico
P3  OP 21263 – cabeçalho + operação + apontamento + tabela de componentes (8 itens)
P4  OP 21263 – desenho técnico
```

Se uma OP tiver muitos componentes a ponto de não caber, o navegador quebra naturalmente (sem cabeçalho repetido).

## Validação

Imprimir pela rota `/producao/impressao-op` as duas OPs (220/21264 e 220/21263) com “Quebrar por operação” + “Imprimir desenhos” marcados, conferir que cada OP usa 2 folhas (1 operação+componentes, 1 desenho) e que não há folha extra com cabeçalho sozinho.
