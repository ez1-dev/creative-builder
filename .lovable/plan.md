

# Ajustes no Painel de Compras

## Visão Geral

Quatro ajustes no `PainelComprasPage.tsx`:

1. **Checkbox "Mostrar valor total da OC"** — adicionar filtro toggle que envia `mostrar_valor_total_oc: true` para a API
2. **Coluna "Valor Total OC" na lista detalhada** — exibir `valor_total_oc` (vinda da API) na tabela analítica, visível somente quando o toggle estiver ativo
3. **Coluna "Valor Total OCs" na visão agrupada por fornecedor** — quando `agrupar_por_fornecedor` estiver ativo, exibir coluna com soma do valor total das OCs
4. **Situação 4 (Liquidado) desliga "Somente pendentes"** — ao selecionar situação `4`, desmarcar automaticamente o checkbox `somente_pendentes`; ao voltar para "Todas", restaurar o padrão

## Mudanças

### `src/pages/PainelComprasPage.tsx`

**Filtros (state + UI):**
- Adicionar `mostrar_valor_total_oc: false` ao estado inicial de `filters`
- Adicionar checkbox "Mostrar valor total da OC" no `FilterPanel`
- No handler do `Select` de situação: quando `v === '4'`, setar `somente_pendentes: false`; quando voltar para outro valor, restaurar `somente_pendentes: true`

**Colunas:**
- Criar coluna condicional `{ key: 'valor_total_oc', header: 'Valor Total OC', align: 'right', render: formatCurrency }` — incluída no array `columns` apenas quando `mostrar_valor_total_oc === true`
- Na visão agrupada (se existir lógica de agrupamento por fornecedor), adicionar coluna `valor_total_ocs`

**Parâmetros da API:**
- Enviar `mostrar_valor_total_oc` na chamada `search()` para que o backend inclua o campo (prioridade: `VlrFin > VlrLiq > VlrOri`)

**Lógica de situação × pendentes:**
- Alterar o `onValueChange` do Select de Situação para:
  ```ts
  onValueChange={(v) => setFilters(f => ({
    ...f,
    situacao_oc: v,
    somente_pendentes: v === '4' ? false : f.somente_pendentes,
  }))}
  ```

## Arquivos afetados
- `src/pages/PainelComprasPage.tsx` — todas as alterações acima

