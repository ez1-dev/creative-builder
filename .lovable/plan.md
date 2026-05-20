## Visualizar OPs selecionadas antes de imprimir

### Objetivo
Separar o fluxo de "Imprimir selecionadas" (que hoje carrega e imprime em sequência) em **dois passos**: primeiro **Visualizar selecionadas** (carrega todas as OPs e monta preview consolidado abaixo da grid), depois **Imprimir visualização** (chama `window.print()` somente do preview montado). A grid já tem checkbox, header de "selecionar todas", `toggleOne`, `toggleAll` e contador.

### Mudanças em `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`

**1. Refatorar `imprimirSelecionadas`** → renomear para `visualizarSelecionadas`:
- Faz exatamente a mesma carga em lote (loop com `concurrency=6` chamando `/api/producao/ordem-producao/impressao` por OP), com os mesmos params (`listar_componentes`, `listar_desenho`, `incluir_desenhos`, `quebrar_por_operacao`, `cod_etg`, `cod_cre`).
- Filtra `cod_ori === '100'` e `sit_orp === 'C'` (mesma regra do `handleRowSelect`).
- Ao final, `setLote({ quantidade_ops, ordens })` + `setPreview(true)` + `reset()` (limpa `data` individual) + `setSelectedRowKey(null)`.
- Coleta erros por OP em `loteFalhas: { cod_ori, num_orp }[]` (novo state) para mostrar no header do preview.
- **Não chama `window.print()`**. Mostra toast de sucesso.

**2. Novo handler `imprimirVisualizacao`**:
- Se `!lote || lote.ordens.length === 0` → toast "Visualize as OPs antes de imprimir." e retorna.
- `await aguardarDesenhosProntos()` → `window.print()`.

**3. Novo handler `limparSelecao`**:
- `setSelectedKeys(new Set())`, `setLote(null)`, `setLoteFalhas([])`, `setPreview(false)`. **Mantém** filtros.

**4. Botões na barra acima da grid** (linhas ~855–877). Substituir o atual "Imprimir selecionadas" por:
- `Visualizar selecionadas` (primary, ícone `Eye`) — `onClick={visualizarSelecionadas}`, `disabled={loteLoading || selectedKeys.size === 0}`.
- `Limpar seleção` (outline) — `disabled={selectedKeys.size === 0 && !lote}`.
- Manter `Imprimir todas` como está.
- Quando `selectedKeys.size === 0`, exibir hint pequeno: "Selecione uma ou mais OPs para visualizar." (no-print, ao lado do contador).

**5. Card de preview consolidado** (novo, antes de `<div className="print-root">`):
- `className="no-print"`, só aparece quando `lote && lote.ordens.length > 0`.
- Header: "Visualização das OPs selecionadas" + subtítulo "`lote.quantidade_ops` OP(s) carregadas`{falhas ? ` • ${falhas.length} falharam` : ''}`".
- Se `loteFalhas.length > 0`: lista compacta "Não foi possível carregar a OP {cod_ori}/{num_orp}".
- Botão `Imprimir visualização` (primary, ícone `Printer`) — `onClick={imprimirVisualizacao}`.
- O preview real continua sendo o `<OpPrintBatch>` dentro de `.print-root` (já existe nas linhas 1056–1063). Não duplicar — apenas garantir `preview={true}` quando `lote` ativo.

**6. `print-root`**: confirmar que `<OpPrintBatch>` recebe `preview={preview}` (já recebe). Confirmar que `OpPrintSheet` individual não aparece simultaneamente — o bloco `{!lote && data?.cabecalho && ...}` já garante exclusão mútua.

### Não fazer
- **Não** criar novo endpoint `/impressao/selecionadas`. O usuário sugeriu mas é melhoria futura — manter as N chamadas paralelas atuais que já funcionam (`concurrency=6`).
- **Não** alterar `OpPrintBatch`, `OpPrintSheet`, CSS de impressão, regra de >7 componentes, quebra por operação, ou desenhos. Tudo isso já é renderizado corretamente por `OpPrintBatch` para cada OP do array.
- **Não** mexer em `imprimirTodas` (lote por filtro) nem em `handleRowSelect` / `handleRowVisualizar` / `handleRowImprimir` (preview de OP única).
- **Não** alterar o fluxo de desenhos com token — `aguardarDesenhosProntos` já espera `<img>` carregar antes do print.

### Resumo dos arquivos
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` — renomear handler, adicionar `imprimirVisualizacao` e `limparSelecao`, novos botões, novo card "Visualização das OPs selecionadas", state `loteFalhas`.
