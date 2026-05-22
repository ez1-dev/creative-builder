## Objetivo

No modo "Quebrar uma página por operação / centro de recurso" da Impressão de OP, repetir o desenho (ou a página branca técnica) **logo após cada operação**, em vez de imprimir um único bloco de desenhos no final da OP.

## Comportamento esperado

Para uma OP com 4 sequências (10, 20, 30, 50):

```
Página 1: Operação seq. 10
Página 2: Desenho da seq. 10
Página 3: Operação seq. 20
Página 4: Desenho da seq. 20
...
```

Se "Imprimir desenhos da OP" estiver desmarcado, não imprime nada de desenho.
Se marcado e não houver desenho, insere a `MissingDrawingPage` após cada operação.

## Mudanças

### `src/components/producao/OpPrintSheet.tsx` — bloco `if (quebrarPorOperacao)`

1. Importar `Fragment` de `react` (já tem `useState` importado, basta adicionar).
2. Dentro do `operacoes.map(...)`, envolver o retorno em `<Fragment key={...}>` e, **após** o `<div op-sheet ...>` da operação, renderizar:
   - Se `imprimirDesenhos && desenhos.length > 0` → chamar `renderDesenhos(\`drw-op-${i}\`)` (chave única por operação para não conflitar com React keys, dado que `renderDesenhos` será invocado N vezes).
   - Caso contrário, se `imprimirDesenhos && desenhos.length === 0 && (!paginasDesenhosA4 || paginasDesenhosA4.length === 0)` → renderizar `<MissingDrawingPage />`.
3. **Remover** do final do bloco `quebrarPorOperacao` as linhas:
   - `{desenhos.length > 0 && renderDesenhos("drw-end")}`
   - `{imprimirDesenhos && desenhos.length === 0 && (...) && <MissingDrawingPage />}`
   
   (Permanecem somente nesse modo — os outros modos `quebrarComponentes` e padrão seguem inalterados.)
4. Manter intactos:
   - Regra de componentes inline (≤ `limiteComp` → primeira operação) e página separada (> `limiteComp` → via `renderComponentesPagesPaginadas()` antes dos desenhos finais? **Atenção:** hoje a página de componentes paginada sai após todas as operações e antes dos desenhos. Como agora o desenho será intercalado, manter `componentesEmPaginaSeparada && renderComponentesPagesPaginadas()` **antes** do map de operações fica errado em relação ao fluxo atual; mantemos no mesmo lugar (após o map) — a página de componentes virá entre a última operação+desenho e nada mais. Isso é aceitável e equivalente ao comportamento atual, só muda a posição relativa dos desenhos.).
   - `preview && renderPreviewDesenhosResumo()` no final.
5. Verificar que `renderDesenhos(prefix)` aceita o prefixo único e gera React keys próprias — já é o padrão usado hoje em `"drw-end"`. Confirmar leitura rápida da função antes de editar.

### Estrutura preservada

- Classe `op-print-unit` continua em cada página de desenho (já é responsabilidade do `renderDesenhos`).
- Sem alterações em `OpPrintBatch`, `ImpressaoOrdemProducaoPage` ou `op-print.css`.
- Sem alterações no backend nem no contrato da API. Caso futuramente venha `desenhos_por_operacao`, o ponto de extensão é exatamente o bloco dentro do `map` — basta trocar `desenhos` por `desenhosPorOperacao[op.seq] ?? desenhos`.

## Fora do escopo

- Modos `quebrarComponentes` e padrão (sem quebra) continuam imprimindo o desenho uma única vez no final, como hoje.
- Suporte real a desenho por sequência (depende de mudança no backend).
- `RelatorioPrintEngine` (Wave 3).
