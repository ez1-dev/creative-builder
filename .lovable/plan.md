## Problema

Ao clicar nos KPIs **"Admitidos no mês"** e **"Demitidos no mês"** em `/rh/quadro-colaboradores`, nada acontece — inclusive quando a data de referência é retroativa (meses anteriores).

**Causa raiz:** em `src/lib/rh/quadroDrillPredicates.ts`, a função `filterDetalheByKpi` não trata as chaves `admitidos_mes` nem `demitidos_mes`. Ela cai no `default: null`, e em `QuadroColaboradoresPage.onKpiClick` o retorno `null` interrompe a abertura do modal — resultado: card sem drill em qualquer data (atual ou retroativa).

## Solução

Adicionar suporte a esses dois KPIs, filtrando o `detalhe` da API pelo `anomes` da data de referência selecionada:

- **Admitidos no mês** → colaboradores cujo `dt_admissao` cai no mês/ano de `data_ref`.
- **Demitidos no mês** → colaboradores cujo `dt_demissao` (ou `dt_rescisao` / `data_demissao` — o que a API devolver) cai no mês/ano de `data_ref`.

### Alterações

1. **`src/lib/rh/quadroDrillPredicates.ts`**
   - Estender `filterDetalheByKpi` para aceitar um parâmetro opcional `anomesRef: string` (formato `yyyyMM`).
   - Novos `case "admitidos_mes"` e `case "demitidos_mes"`: filtram `detalhe` comparando o mês/ano das datas de admissão/demissão contra `anomesRef`.
   - Aceitar variações de nome do campo demissão (`dt_demissao`, `dt_rescisao`, `data_demissao`) via acesso `x[key]` para tolerar o payload do backend.
   - Helper `parseAnomes(dataStr)` que aceita ISO (`YYYY-MM-DD`), BR (`DD/MM/YYYY`) e devolve `yyyyMM`.

2. **`src/pages/rh/QuadroColaboradoresPage.tsx`**
   - Em `onKpiClick`, passar `toAnomes(dataRef)` (já existe helper equivalente para `dataRefIso`) para `filterDetalheByKpi`.
   - Nenhuma outra alteração de layout/UI.

### Observações

- Se a API não entregar data de demissão dentro de `detalhe`, o filtro resultante ficará vazio; nesse caso o toast atual "Sem colaboradores para este recorte." já cobre o feedback (não é regressão, é reflexo do payload).
- Datas retroativas já são recarregadas pelo `useQuery` a cada mudança de `data_ref`; nenhum ajuste de cache é necessário.
- Escopo estritamente frontend/apresentação, sem tocar em backend, RLS ou tipos gerados.
