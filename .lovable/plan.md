## Diagnóstico

No modo `quebrarPorOperacao = true`, o `OpPrintSheet` hoje:

1. Renderiza os componentes **acima** da operação na **primeira** operação (`temComponentesInline = isPrimeira && componentesInline`). Isso contradiz a regra do usuário, que pede os componentes **abaixo** da operação, e na **última** operação (visualmente, o mais natural para uma OP de operação única é "componentes logo após o bloco da operação").
2. Reduz dinamicamente os blocos de apontamento (`blocos = 4` ou `5`) para tentar fazer caber tudo na mesma folha — isso quebra a paridade entre "Visualizar" e "Imprimir visualização" porque o cálculo só compensa o caso inline na 1ª op.
3. O wrapper `op-print-page` em `OpPrintBatch` já é evitado quando `quebrarPorOperacao`, mas o CSS atual ainda aplica `page-break-after: always !important` em `.operation-single-page` sem considerar `:last-child`, gerando páginas em branco no fim do lote (corrigido parcialmente na última iteração).

A correção é estrutural: alinhar a ordem dos blocos à regra do usuário e padronizar uma única renderização para preview e impressão.

## Mudanças

### 1. `src/components/producao/OpPrintSheet.tsx` — bloco `if (quebrarPorOperacao)`

Nova ordem de renderização por operação:

```text
Cabeçalho da OP
Bloco da Operação (com apontamento, 6 blocos padrão)
[Componentes inline] — somente na ÚLTIMA operação, se componentes.length ≤ 7
```

Após o loop:

```text
[Página separada de componentes] — somente se componentes.length > 7
[Desenhos] — um por página (já é o comportamento atual)
```

Pseudocódigo:

```tsx
const qtd = componentes.length;
const componentesPequenos = qtd > 0 && qtd <= limiteComp;        // inline
const componentesGrandes  = qtd > limiteComp;                    // página separada

return (
  <>
    {operacoes.map((op, i) => {
      const isUltima = i === operacoes.length - 1;
      const temComponentesInline = isUltima && componentesPequenos;
      // Sem componentes inline → 6 blocos.
      // Com componentes inline → reduz blocos para garantir encaixe.
      let blocos = 6;
      if (temComponentesInline) {
        if (qtd <= 3) blocos = 5;
        else if (qtd <= 7) blocos = 4;
      }
      return (
        <div className="op-sheet op-operation-page operation-single-page ...">
          {renderHeader()}
          <div className="op-section-title">Operação</div>
          {renderOperacao(op, i, blocos)}
          {temComponentesInline && (
            <div className="componentes-inline">
              {renderComponentes()}
            </div>
          )}
        </div>
      );
    })}
    {componentesGrandes && renderComponentesPage()}
    {desenhos.length > 0 && renderDesenhos('drw-end')}
    {renderPreviewDesenhosResumo()}
  </>
);
```

Regras garantidas:
- Componentes **nunca aparecem antes** da operação.
- Componentes aparecem **uma única vez** (inline ou em página separada, nunca os dois).
- Componentes não somem: quando `qtd > 7` cai na `renderComponentesPage()` com cabeçalho repetido.
- Desenhos sempre depois.

### 2. `src/components/producao/OpPrintBatch.tsx`

Sem alteração de estrutura. Já evita wrapper `op-print-page` quando `quebrarPorOperacao`. O mesmo componente continua sendo usado em "Visualizar selecionados" e "Imprimir visualização" (são o mesmo render — só muda `@media print`).

### 3. `src/components/producao/op-print.css`

Pequenos ajustes:

- Garantir que `.componentes-inline` venha **depois** da operação visualmente, com `margin-top` adequado e `break-inside: avoid` para não rachar entre páginas:
  ```css
  .componentes-inline {
    margin-top: 4pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  ```
- Compactar a tabela inline quando há muitos componentes (≤7) para encaixar:
  ```css
  @media print {
    .componentes-inline table { font-size: 8pt; line-height: 1.05; }
    .componentes-inline th,
    .componentes-inline td { padding: 1pt 3pt; }
  }
  ```
- Manter as regras `:last-child { page-break-after: avoid }` já adicionadas (eliminam as páginas em branco no fim).

> Observação: **não** vou trocar a `@page margin: 7mm` para `4mm` nem renomear classes (`op-page-fit`, `op-header`, `op-operation-section`, `op-report-footer`) — essas classes não existem no projeto e a margem de 7mm está calibrada com `width: 196mm` em todo o CSS. Mudar isso quebraria os outros modos (busca individual e modo padrão).

## Resultado esperado

Com `Quebrar por operação = Sim` e `Imprimir desenhos = Sim`:

| Cenário | Páginas |
|---|---|
| 1 operação, 6 componentes, 1 desenho | P1: cabeçalho + operação + componentes · P2: desenho |
| 1 operação, 8 componentes, 1 desenho | P1: cabeçalho + operação · P2: cabeçalho + componentes · P3: desenho |
| N operações, 6 componentes, k desenhos | P1..PN-1: cabeçalho + operação · PN: cabeçalho + operação + componentes · P(N+1..): desenhos |
| N operações, 8 componentes, k desenhos | P1..PN: cabeçalho + operação · P(N+1): cabeçalho + componentes · resto: desenhos |

"Visualizar selecionados" e "Imprimir visualização" passam a mostrar exatamente a mesma sequência (já usam o mesmo componente; o que muda é só `@media print` ocultar chrome do app).

## Verificação

Reimprimir a OP 7093 (10 componentes) e uma OP com ≤7 componentes. Confirmar pelo Ctrl+P:
- OP 7093: P1 operação · P2 componentes (sem páginas em branco no fim).
- OP pequena: P1 cabeçalho + operação + componentes na mesma folha.
- Componentes não aparecem mais antes da operação.
