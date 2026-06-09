## Diagnóstico

Procurei no código todo (`rg "30000000|3000000|meta\s*=\s*[0-9]"`) e **não existe nenhum valor de meta fixo/hardcoded** (nem 30.000.000) em `src/pages/bi/ComercialPage.tsx` nem no resto do BI Comercial.

O card **Resumo Faturamento** já funciona assim hoje:

- `Realizado`, `Meta`, `Diferença` vêm de `kpis.faturamento`, `kpis.meta`, `kpis.diferenca`
- `kpis` é construído a partir de:
  1. `qKpis = fetchComercialKpis(filters)` → `GET /api/bi/comercial/kpis` (FastAPI), passando **todos** os filtros do dashboard (`anomes_ini`, `anomes_fim`, `unidade_negocio`, `cd_cliente`, `cd_rev_pedido`, `cd_origem`, `cd_tp_movimento`, `cd_tns`, `cd_produto`, `cd_estado`).
  2. **Override de Meta**: `fetchMetaCloudTotal({ anomes_ini, anomes_fim, unidade_negocio })` lê `bi_meta_faturamento` no Cloud e, se houver metas cadastradas (MANUAL ou UPQUERY), substitui `kpis.meta` e recalcula `diferenca` e `pct_atingimento`.

Ou seja, os 30M que aparecem **já vêm da API/Cloud**, não de um literal no código. Se o valor está “errado”, ele veio do banco de metas ou da FastAPI.

## O que vou fazer

### 1. Garantir 100% API-driven (sanity check, sem hardcode)
Reafirmar — sem alterar lógica — que o `KpiTriStackCard` do bloco `resumo-faturamento` consome só `kpis.faturamento / kpis.meta / kpis.diferenca`. Nenhum literal será introduzido. Caso ache algum fallback do tipo `meta ?? 30000000` em util/teste, removo. (Pelo `rg` atual, não existe.)

### 2. Botão “Atualizar metas” no card Resumo Faturamento
Adicionar um pequeno botão (ícone `RefreshCw`, `variant="ghost"`, `size="icon"`) no canto superior direito do `KpiTriStackCard` do `resumo-faturamento`, que:

- Chama `sincronizarMetasUpquery({ anomes_ini: filters.anomes_ini, anomes_fim: filters.anomes_fim })` (já existe em `src/lib/bi/metasFaturamentoApi.ts` e proxia `POST /api/bi/comercial/metas/sincronizar` via edge function `sync-metas-upquery`, mantendo o `CRON_SECRET` no servidor).
- Mostra `toast.loading` → `toast.success/error` com totais retornados.
- No sucesso, invalida `['bi-comercial','meta-cloud', …]` e `['bi-comercial','kpis', …]` e dá `refetch` para o card atualizar Meta/Diferença/% imediatamente.
- Botão visível só para `isAdmin` (mesma regra dos outros botões de sync da página). Desabilitado enquanto está sincronizando, com spinner.

Para suportar a ação sem quebrar o layout existente, vou adicionar uma prop opcional `headerAction?: ReactNode` ao `KpiTriStackCard` (renderizada no `CardHeader`, à direita do título). Default `undefined` — nenhum outro uso é afetado.

### 3. Filtros aplicados
Confirmar que a sincronização usa os mesmos `anomes_ini` / `anomes_fim` do dashboard. A FastAPI hoje sincroniza por período, não por unidade — então `unidade_negocio` não é enviado para o endpoint de sync (o filtro continua valendo na leitura via `fetchMetaCloudTotal`). `fonte_acao` não existe no contrato atual do BI Comercial; se você quiser que eu adicione, me diga o nome exato do campo.

## Arquivos a alterar

- `src/components/bi/kpis/KpiTriStackCard.tsx` — adicionar prop `headerAction?: ReactNode`.
- `src/pages/bi/ComercialPage.tsx` — passar `headerAction={<BotaoAtualizarMetas …/>}` ao card do `resumo-faturamento`; criar handler `handleSyncMetas` (chama `sincronizarMetasUpquery`, faz toast + refetch de `qMetaCloud`/`qKpis`).

## Fora de escopo

- Nenhuma mudança em `metasFaturamentoApi.ts`, na edge function `sync-metas-upquery`, no FastAPI ou no contrato dos endpoints.
- Nenhuma mudança em outros widgets (`gauge-atingimento`, `kpi-meta`, `kpi-diferenca`) — eles já leem do mesmo `kpis`.

## Confirmações que preciso

1. Confirma que o botão é só para `isAdmin` (igual aos outros “Sincronizar …”)?
2. `fonte_acao` — não existe no BI Comercial hoje; quer que eu ignore ou tem nome real do filtro?