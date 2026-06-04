## Objetivo

Exibir as metas cadastradas em `bi_meta_faturamento` (Cloud) também no gráfico **"Faturamento mensal x Meta"**, mantendo o override já existente nos KPIs (Meta / Diferença / % Atingimento).

Hoje os KPIs já consideram a meta do Cloud via `fetchMetaCloudTotal` + override em `kpis` no `ComercialPage`. O gráfico mensal, porém, ainda usa `m.meta` vindo do FastAPI (ERP), ignorando o cadastro manual. Vamos corrigir só isso (e garantir que o KPI continue consistente).

## Mudanças

### 1. `src/lib/bi/metasFaturamentoApi.ts`

Adicionar `fetchMetasMensalMap({ anomes_ini, anomes_fim, unidade_negocio })`:

- Lê `bi_meta_faturamento` (somente `ativo = true`) no intervalo.
- Quando `unidade_negocio` for `GENIUS` ou `ESTRUTURAL ZORTEA`, filtra pela unidade.
- Quando for `CONSOLIDADO`, soma as duas unidades por mês.
- Retorna `Record<anomes_emissao, number>` (chave `'YYYYMM'`). Vazio = nenhuma meta cadastrada.

`fetchMetaCloudTotal` permanece como está (usado pelo KPI agregado).

### 2. `src/pages/bi/ComercialPage.tsx`

- Novo `useQuery` `qMetaCloudMensal` chamando `fetchMetasMensalMap` com o mesmo invalidation dos KPIs (mesmo `queryKey` base + sufixo `mensal`). Refetch incluído em `atualizar()`.
- Em `dadosCombo` (linha 159–162), aplicar override por mês: se houver entrada no mapa para aquele `anomes`, usar o valor do Cloud; senão manter `m.meta` do ERP.
- Nada mais muda: legenda, cores, tooltip, drill (`onClickMensal`) continuam iguais. `ComboChartCard` já consome `meta` como `lineKey`.
- Manter o override agregado dos KPIs (já feito). Opcionalmente, recalcular o total do KPI a partir do mapa mensal para garantir coerência exata com o gráfico — manteremos `fetchMetaCloudTotal` como fonte do KPI, já que o backend soma a mesma tabela e o resultado é equivalente.

### Fora de escopo

- Não mexer no FastAPI nem na coluna `meta` retornada por `/api/bi/comercial/mensal`.
- Não tocar em `useComercialLayout`, `PassagensLayoutGrid` ou no fluxo de edição/save de dashboard.
- Não alterar a tela `/bi/comercial/metas`.

## Critérios de aceite

- Cadastrando metas em `/bi/comercial/metas` para `GENIUS` em jan–abr/2026, ao abrir `/bi/comercial` com unidade GENIUS e período `202601–202606`:
  - KPI **Meta** mostra a soma das metas cadastradas.
  - Linha "Meta" do gráfico **Faturamento mensal x Meta** mostra o valor cadastrado em cada mês.
- Sem metas cadastradas no período: gráfico e KPIs voltam ao comportamento atual (valor do ERP / null).
- Para `CONSOLIDADO`: soma GENIUS + ESTRUTURAL ZORTEA por mês.