## Mudança

No modo `quebrarPorOperacao`, inverter a ordem dentro da folha por operação: componentes **acima** da operação, na primeira folha, sem repetir cabeçalho.

### `src/components/producao/OpPrintSheet.tsx`

No bloco `if (quebrarPorOperacao)`:
- Trocar `isUltima` por `isPrimeira = i === 0`.
- Mover o bloco `{isPrimeira && componentes.length > 0 && <div className="componentes-inline">{renderComponentes()}</div>}` para **antes** do `<div className="op-section-title">Operação</div>`.

Ordem final por folha da primeira operação:
1. `renderHeader()`
2. Componentes inline (sem cabeçalho extra)
3. Título "Operação" + `renderOperacao()`
4. `renderFooter()`

Demais operações: só cabeçalho + operação + rodapé.
Depois de todas as operações: desenhos em folhas próprias (`renderDesenhos`).

### `src/components/producao/op-print.css`

Ajustar `.componentes-inline`: trocar `margin-top: 6pt` por `margin-bottom: 8pt` para separar dos componentes da operação que vem logo abaixo.

## Alcance

Vale para os três fluxos (impressão individual, "Visualizar selecionados", "Imprimir visualização") — todos usam `OpPrintSheet`.

Sem mudança em API, busca, desenhos, cabeçalho ou modo padrão (sem quebra).
