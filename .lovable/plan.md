## Diagnóstico

O filtro `unidade_negocio` é enviado ao backend FastAPI, mas o backend não está respeitando (ou ainda não foi implementado). Como solução, vamos passar a filtrar no **frontend**, após receber os dados.

## Escopo

O campo `unidade_negocio` só existe nas linhas das abas **Comercial por Unidade** e **Técnico / Conciliação** (as outras tabelas — Resumo, Por movimento, Por TNS, Detalhes — não têm esse campo, então o filtro não se aplica a elas).

## Alterações em `src/pages/bi/FaturamentoValidacaoPage.tsx`

1. **Deixar de enviar `unidade_negocio` ao backend** (remover do payload das chamadas comercial/técnica) — evita confusão e garante que o filtro é puramente client-side.

2. **Filtrar `qUniCom.data` no frontend** via `useMemo`:
   - Parse do CSV `filtros.unidade_negocio` em lista.
   - Se lista vazia → retorna dados como estão.
   - Caso contrário → mantém apenas linhas cujo `unidade_negocio` está na lista.
   - **CONSOLIDADO**: se o usuário selecionar apenas uma unidade (ex.: só `GENIUS`), recalcular a linha `CONSOLIDADO` por mês a partir da unidade restante (ou ocultar se não fizer sentido). Se selecionar as duas, manter o CONSOLIDADO original.

3. **Filtrar `qUniTec.data` no frontend** via `useMemo`:
   - Mesma lógica de parse + `Array.filter`.

4. Passar os arrays filtrados para os respectivos `DataTableBI`.

Nenhuma mudança em backend, RPC, docs ou na camada `src/lib/bi/faturamentoValidacao.ts`.
