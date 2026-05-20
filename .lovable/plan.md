## Objetivo

Quando a OP tiver mais de 7 componentes (ou quando a API retornar `op.layout_componentes.quebrar_componentes_em_pagina_separada === true`), mover a "Relação de Componentes Necessários" para uma página A4 dedicada, entre o cabeçalho da OP e as operações.

## Arquivos alterados

### 1. `src/lib/producao/opImpressao.ts`
Adicionar campo opcional na interface `OpImpressao`:
```ts
layout_componentes?: {
  quebrar_componentes_em_pagina_separada?: boolean;
};
```
(Não altera comportamento atual; apenas tipagem.)

### 2. `src/components/producao/OpPrintSheet.tsx`

Criar critério único:
```ts
const quebrarComponentes =
  data?.layout_componentes?.quebrar_componentes_em_pagina_separada
  ?? (componentes.length > 7);
```

Criar helper `renderComponentesPage()` que retorna um bloco `.componentes-page .op-sheet` contendo:
- `renderHeader()` (cabeçalho completo da OP repetido)
- Título "RELAÇÃO DE COMPONENTES NECESSÁRIOS"
- Tabela atual de componentes (mesmas colunas: Código, Descrição, Qtde. Prev., UN, Dep., Endereço), agrupada por estágio como hoje.

Criar helper `renderIndicacaoComponentesSeparados()` que retorna uma linha discreta no lugar da tabela:
"Componentes impressos em página separada".

#### Modo padrão (uma página)
- Se `quebrarComponentes` for false → comportamento atual (cabeçalho + componentes + operações + rodapé).
- Se `quebrarComponentes` for true:
  - Página 1: `.op-sheet` com cabeçalho + indicação "Componentes impressos em página separada" + Operações + rodapé. NÃO renderizar `renderComponentes()`.
  - Página 2: `<div class="op-sheet componentes-page">` com cabeçalho + título + tabela de componentes. Sem operações, sem rodapé operacional (manter apenas o `op-footer` simples para identificação).
  - Operações continuam na página 1 (não muda a quebra atual).
  - Ordem de renderização no JSX: Página 1 → Página 2 (componentes) → Desenhos.
  - Observação: o pedido descreve "Página 1 / Página 2 (componentes) / Página 3 operações". Como a página 1 atual já contém o cabeçalho+dados principais+operações, vou seguir literalmente: separar em três blocos quando `quebrarComponentes` for true:
    - **Página 1**: cabeçalho + dados principais + indicação ("Componentes impressos em página separada"). Sem operações.
    - **Página 2**: `.componentes-page` cabeçalho + tabela completa de componentes.
    - **Página 3+**: cabeçalho + título "Operações" + operações + rodapé. Se `quebrarPorOperacao` estiver marcado, cada operação vai para uma página própria (já existente).

#### Modo `quebrarPorOperacao`
- Se `quebrarComponentes` for true:
  - Inserir página de componentes ANTES do loop de operações (após uma página 1 só com cabeçalho + indicação) ou, para evitar página 1 quase vazia, fundir página 1 com a primeira operação? Pedido é claro: página 1 separada. Implementação:
    - Renderizar uma "página 1" `.op-sheet` só com cabeçalho + indicação + rodapé.
    - Renderizar `.componentes-page`.
    - Renderizar cada operação em página própria como hoje (sem `renderComponentes()` dentro).
- Se `quebrarComponentes` for false: manter código atual (cada operação repete cabeçalho + componentes + operação).

### 3. `src/components/producao/op-print.css`
Adicionar/garantir os blocos CSS exigidos:
```css
.op-print-page {
  width: 210mm;
  min-height: 297mm;
  page-break-after: always;
  break-after: page;
}
.op-print-page:last-child {
  page-break-after: auto;
  break-after: auto;
}
.componentes-page {
  width: 210mm;
  min-height: 297mm;
  page-break-after: always;
  break-after: page;
}
.componentes-page table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.componentes-page th,
.componentes-page td {
  border: 1px solid #000;
  padding: 2px 4px;
}
.componentes-page tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
```
A classe `.op-sheet` atual já implementa página A4; adicionaremos `.componentes-page` em conjunto (`<div class="op-sheet componentes-page">`) para reforçar a quebra. Garantir que a página de operações também receba `page-break-before: always` quando precedida pela página de componentes.

## Fora do escopo
- Backend / endpoint (sem mudanças).
- Lógica de desenhos, `quebrar_por_operacao`, `incluir_desenhos` (preservados).
- Impressão em lote (`opImpressaoLote.ts`) — a renderização final usa o mesmo `OpPrintSheet`, então a regra se aplica automaticamente; nenhum ajuste adicional necessário.

## Resumo do critério
| Condição | Resultado |
|---|---|
| `componentes.length ≤ 7` e sem flag | Layout atual (1 página) |
| `componentes.length > 7` OU `layout_componentes.quebrar_componentes_em_pagina_separada === true` | Página 1 (cabeçalho + indicação) → Página 2 (componentes) → Página 3+ (operações) |
