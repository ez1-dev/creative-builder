## Objetivo

Quando `quebrar_por_operacao = S`, repetir os desenhos da OP **após cada operação** (cada desenho em página A4 própria). Manter o comportamento atual quando `= N`.

## Mudança principal

`src/components/producao/OpPrintSheet.tsx` — branch `if (quebrarPorOperacao)` (linhas ~356–394):

Hoje renderiza todas as páginas de operação e, no final, **uma única vez**, `renderDesenhos()`. Trocar por: para cada operação, renderizar a página da operação **e em seguida** renderizar os desenhos logo após.

```tsx
{operacoes.map((op, i) => (
  <React.Fragment key={`opp-${i}`}>
    <div className={`op-sheet operation-single-page ${preview ? 'op-sheet--preview' : ''}`}>
      {renderHeader()}
      {!quebrarComponentes && renderComponentes()}
      <div className="op-section-title">Operação</div>
      {renderOperacao(op, i)}
      {renderFooter()}
    </div>
    {renderDesenhosParaOperacao(i)}
  </React.Fragment>
))}
{renderPreviewDesenhosResumo()}
```

Onde `renderDesenhosParaOperacao(opIndex)` é igual ao atual `renderDesenhos()`, porém:
- usa keys únicas (`drw-${opIndex}-${i}`) para evitar colisões de React key entre operações.
- só renderiza se `desenhos.length > 0` (nada na área impressa quando vazio — mensagem permanece só no preview, via `renderPreviewDesenhosResumo`, que continua sendo chamado uma única vez no fim).

Remover a chamada única `{renderDesenhos()}` antes do resumo de preview neste branch.

## Modo padrão (`quebrar_por_operacao = N`)

Não alterar. As duas branches existentes (`quebrarComponentes` e default) continuam chamando `renderDesenhos()` + `renderPreviewDesenhosResumo()` uma única vez ao final.

## CSS — `src/components/producao/op-print.css`

Garantir as regras pedidas (a maioria já existe; conferir/ajustar):
- `.op-print-page, .op-operation-page`: `width:210mm; min-height:297mm; page-break-after:always; break-after:page;`
- `.op-drawing-page`: `width:210mm; height:297mm; page-break-after:always; break-after:page; display:flex; align-items:center; justify-content:center; overflow:hidden; background:white;`
- `.op-drawing-page img`: `max-width:190mm; max-height:270mm; object-fit:contain;`
- `.op-drawing-page object, .op-drawing-page iframe`: `width:190mm; height:270mm; border:none;`
- `.op-print-page:last-child, .op-operation-page:last-child, .op-drawing-page:last-child`: `page-break-after:auto; break-after:auto;`

Aplicar a classe `op-operation-page` também na div `op-sheet operation-single-page` (somando classes) para conformidade com o seletor pedido — manter `op-sheet` para manter estilos visuais.

## Pré-impressão (já existente, sem mudança)

A página `ImpressaoOrdemProducaoPage` já chama `aguardarDesenhosProntos()` antes de `window.print()` e `useAuthedBlobUrls` já faz fetch com token → blobUrl. Como o mesmo desenho será reutilizado em várias páginas, o blobUrl precomputado (`blobStates`) é compartilhado por todas as instâncias de `DrawingPage` — sem duplicação de download.

## Fora de escopo

- Filtro Produto (3 edições pendentes da conversa anterior — tratar em outro turno).
- Mudanças no backend, no `useAuthedBlobUrls` ou no `OpPrintBatch`.
- Layout interno de cabeçalho/rodapé/operação.
