## Objetivo

Permitir que o usuário **selecione manualmente quais OPs imprimir** na grid de Impressão de Ordem de Produção, em vez de imprimir apenas "uma" ou "todas".

## Comportamento

- Cada linha da grid ganha um **checkbox** à esquerda.
- Cabeçalho da grid ganha um checkbox "selecionar todas / nenhuma" (aplicado às OPs visíveis após filtros).
- Barra superior da grid passa a mostrar: `X de Y OPs selecionadas` + botões:
  - **Imprimir selecionadas** (habilitado quando ≥ 1 selecionada)
  - **Imprimir todas** (comportamento atual, mantido)
- Ao clicar em **Imprimir selecionadas**:
  - Buscar cada OP selecionada via endpoint atual `/api/producao/ordem-producao/impressao` (com `cod_emp`, `cod_ori`, `num_orp` e os flags `listar_componentes` / `listar_desenho` correntes).
  - Agregar resultados em `ImpressaoOpLoteResponse` (`quantidade_ops` + `ordens[]`).
  - Setar `lote` no estado e disparar `window.print()` — reusa o componente `OpPrintBatch` já existente.
- Mudança de filtro (origem, situação, pedido, relatório, centro de recurso, estágio, empresa) e `limpar` zeram a seleção.
- OPs com `sit_orp = 'C'` continuam excluídas (já filtradas em `opsFiltradas`).

## Arquivos a alterar

### `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Novo estado `selectedKeys: Set<string>` (chave = `${cod_emp}-${cod_ori}-${num_orp}`).
- Helper `keyOf(op)` reutilizado entre render e ações.
- Resetar seleção em: `onChangeEmpresa`, `onChangePedido`, `onChangeRelatorio`, `onChangeOrigem`, `onChangeSituacao`, `onChangeCentroRecurso`, `onChangeEstagio`, `onSelectOp` (quando vira modo OP única), `limpar`.
- Cabeçalho da grid: nova `<TableHead>` com checkbox master (estado indeterminado quando seleção parcial).
- Cada `<TableRow>`: nova `<TableCell>` com checkbox controlado por `selectedKeys`.
- Barra acima da tabela:
  - Texto "X de Y selecionadas" (quando `selectedKeys.size > 0`).
  - Botão "Imprimir selecionadas" → nova função `imprimirSelecionadas()`.
  - Manter botão "Imprimir todas".
- Nova função `imprimirSelecionadas()`:
  - Monta lista de OPs a partir de `opsFiltradas.filter(o => selectedKeys.has(keyOf(o)))`.
  - Para cada OP, chama `api.get<OpImpressao>('/api/producao/ordem-producao/impressao', {...})` em paralelo (`Promise.all`) com limite de concorrência simples (ex.: 8) para não estourar o backend.
  - Constrói `{ quantidade_ops, ordens }` e seta em `lote`.
  - Tratamento de erro: se alguma falhar, `toast.error` com contagem de falhas e segue imprimindo as que vieram.
  - `setLoteLoading(true/false)` reaproveitado.

### Componentes de UI
- Usar `Checkbox` de `@/components/ui/checkbox` (shadcn já presente).
- Sem novas dependências, sem alteração de design system.

## Regras preservadas
- `cod_ori = 100` bloqueada.
- `sit_orp = 'C'` excluída.
- Layout do `Card` de filtros e do `OpPrintBatch` permanece igual.
- Nenhuma mudança em backend / hooks / lib de impressão em lote.

## Fora de escopo
- Persistir seleção entre navegações.
- Alterar `fetchImpressaoLote` ou o endpoint `/impressao/lote`.
- Mudanças visuais nos filtros ou no print sheet.
