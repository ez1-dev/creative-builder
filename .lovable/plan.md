
## Objetivo
Ajustar a tela `Impressão de Ordem de Produção` para nunca exibir OPs canceladas, adicionar filtro de Situação, mostrar a coluna Situação na grid e habilitar impressão em lote (todas as OPs de um Pedido ou Relatório).

## Mudanças

### 1. Tipos (`src/lib/producao/opcoesImpressao.ts`)
- `OpcaoOp`: adicionar `sit_orp?: string` e `situacao_descricao?: string`.
- Nova interface `OpcaoSituacao { sit_orp: string; descricao: string; label?: string }`.
- `OpcoesImpressao`: adicionar `situacoes?: OpcaoSituacao[]`.
- `OpcoesImpressaoParams`: adicionar `sit_orp?: string`.

### 2. Filtros (`src/lib/producao/opImpressao.ts`)
- `ImpressaoOpFiltros`: adicionar `sit_orp?: string`.

### 3. Hook de opções (`src/hooks/useOpcoesImpressaoOp.ts`)
- Novo estado `situacoes` populado em `reloadBase` (filtrando `sit_orp !== 'C'`).
- `fetchOpcoes` passa `sit_orp` na query quando informado.
- Helper `dropCanceladas(arr)` que remove qualquer item com `sit_orp === 'C'`; aplicar em todos os setters de `ops` (`reloadBase`, `reloadByPedido`, `reloadByRelatorio`, `searchOps`).
- `reloadByPedido` e `reloadByRelatorio` aceitam `sit_orp?` opcional.
- Nova função `reloadBySituacao(cod_emp, sit_orp, { num_ped?, rel_prd? })` para uso quando o usuário muda apenas a Situação.

### 4. Página (`src/pages/producao/ImpressaoOrdemProducaoPage.tsx`)
- Adicionar `sit_orp: ''` em `EMPTY` e no estado.
- Novo Select `Situação` no grid de filtros (4º slot, junto com Empresa/Pedido/Relatório), opções vindas de `opcoes.situacoes`, sem `Cancelada`.
- `onChangeSituacao(v)`: atualiza filtro e chama o endpoint correspondente:
  - Se houver `num_ped`: `reloadByPedido(emp, num_ped, v)`
  - Senão se houver `rel_prd`: `reloadByRelatorio(emp, rel_prd, v)`
  - Senão: `reloadBySituacao(emp, v)`
- `onChangePedido` / `onChangeRelatorio` repassam `sit_orp` atual.
- `searchOpsFetcher` passa `sit_orp`.
- Grid de OPs:
  - Nova coluna **Situação** (`op.situacao_descricao ?? op.situacao ?? ''`).
  - `opsFiltradas` adiciona `.filter(o => String(o.sit_orp ?? '').toUpperCase() !== 'C')` como salvaguarda.
- Novo botão **Imprimir todas** ao lado da grid, visível apenas quando `opsFiltradas.length > 1` e houver `num_ped` ou `rel_prd`.

### 5. Impressão em lote
- Novo módulo `src/lib/producao/opImpressaoLote.ts` com função `fetchImpressaoLote({ cod_emp, num_ped?, rel_prd?, sit_orp?, listar_componentes, listar_desenho })` chamando `GET /api/producao/ordem-producao/impressao/lote`. Resposta: `{ quantidade_ops, ordens: OpImpressao[] }`.
- Novo hook leve `useImpressaoOrdemProducaoLote` (loading/erro/dados).
- Novo componente `src/components/producao/OpPrintBatch.tsx`:
  - Recebe `ordens: OpImpressao[]`.
  - Renderiza cada OP envolvida em `<div className="op-print-page">…OpPrintSheet…</div>`.
- CSS em `src/components/producao/op-print.css`:
  ```css
  .op-print-page { page-break-after: always; break-after: page; }
  .op-print-page:last-child { page-break-after: auto; break-after: auto; }
  ```
- Página: ao clicar **Imprimir todas**:
  1. Chama `fetchImpressaoLote(...)` com `sit_orp` atual e `listar_componentes`/`listar_desenho` do form.
  2. Salva resultado em estado `lote`.
  3. Renderiza `<OpPrintBatch>` no lugar de `<OpPrintSheet>` (mantendo `no-print` em filtros/grid/header).
  4. Após render, `setTimeout(window.print, 200)`.
  5. Toast com `quantidade_ops` impressas.

### 6. Saneamento extra (quietly)
- A runtime error atual mostra `observacoes` chegando como objetos. Em `OpPrintSheet`, normalizar: `const obsList = observacoes.map(o => typeof o === 'string' ? o : (o?.observacao ?? ''))` antes de renderizar.

### 7. Documentação (`docs/backend-impressao-ordem-producao.md`)
- Adicionar seção sobre `sit_orp` em `/opcoes`, `situacoes[]` na resposta e o endpoint `/impressao/lote` com payload de exemplo.

## Fora de escopo
- Backend, layout do `OpPrintSheet` em si, demais telas de produção.

## Regras invioláveis mantidas
- Nunca enviar `cod_ori=100`.
- Nunca exibir OP com `sit_orp === 'C'` em selects, autocomplete ou grid.
- Situação "Cancelada" não aparece no select de Situação.
