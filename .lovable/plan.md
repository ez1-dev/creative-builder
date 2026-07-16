## Objetivo

Ajustar o drill de LANÇAMENTO da DRE (drawer usado a partir de `DrePage`) para refletir o novo contrato do endpoint `GET /api/bi/contabilidade/dre-drill?tipo_drill=LANCAMENTO`, que passou a devolver a granularidade **lançamento × centro de custo**. O frontend precisa apenas exibir corretamente os novos campos — nada de recalcular, deduplicar ou agrupar.

## Escopo (somente frontend)

Arquivos afetados:
- `src/lib/bi/dreDrillApi.ts` — tipos.
- `src/components/bi/contabilidade/DreDrillDrawer.tsx` — colunas, chave da linha, empty state, ação por linha.

Fora de escopo: backend, endpoint, filtros, `useDreDrill`, cálculo de totais da DRE, rateio.

## Alterações

### 1. Tipos (`dreDrillApi.ts`)
- Exportar novo tipo `DreDrillLancamentoItem` conforme a especificação (todos os campos opcionais/nulos), sem remover `DreDrillRow` — ele continua sendo o container genérico das linhas de `rows`, apenas ganha os aliases novos:
  ```ts
  cd_lancamento?: string | number | null;
  cd_documento?: string | null;
  cd_mascara?: string | null;
  qtd_lancamentos?: number | null;
  total?: number | null;
  av?: number | null;
  ```
- Manter aliases antigos (`nr_lancamento`, `nr_documento`, `vl_realizado`, `cd_cencus`) só como campos opcionais legados de compat — nada é removido do tipo, o frontend só ganha novos.

### 2. Drawer (`DreDrillDrawer.tsx`)
- **Sem dedup.** Confirmar por leitura que não existe agrupamento/dedup por `cd_lancamento`/`nr_lancamento` no drawer nem em helpers próximos. Já é apenas `rows.map((row, i) => …)`.
- **Chave composta** por linha (substituir o `key={i}` atual):
  ```ts
  const rowKey = [
    row.cd_lancamento ?? row.nr_lancamento ?? "",
    row.cd_centro_custos ?? row.cd_cencus ?? "SEM_CENTRO",
    row.cd_documento ?? row.nr_documento ?? "",
    i,
  ].join("-");
  ```
- **Colunas para LANCAMENTO**: o backend já dita `data.columns`. O drawer só injeta extras que a API ainda não enviou. Ampliar a injeção atual para incluir também `ds_centro_custos` (Descrição do Centro), mantendo a ordem sugerida: Centro de Custos → Descrição do Centro → CC Grupo, inseridos antes da primeira coluna monetária.
- **"SEM CENTRO"** já é tratado para `cd_centro_custos`/`cd_cencus`; estender a mesma regra visual (itálico + texto "SEM CENTRO") também para `ds_centro_custos` vazio, exibindo apenas em `cd_centro_custos` (na descrição, célula vazia continua "-").
- **Empty state**: quando `tipo_drill === 'LANCAMENTO'` e `rows.length === 0`, exibir "Nenhum lançamento encontrado para os filtros selecionados." Caso contrário, manter o texto genérico atual.
- **Erro**: quando `tipo_drill === 'LANCAMENTO'`, prefixar a mensagem com "Não foi possível carregar os lançamentos da DRE." mantendo o detalhe técnico logo abaixo.
- **Ações da linha**: os handlers de Exceção/Classificar/Criar regra recebem `nr_lancamento`, `nr_documento`, `cd_cencus`. Fazer fallback para os novos nomes: `row.nr_lancamento ?? row.cd_lancamento`, `row.nr_documento ?? row.cd_documento`, `row.cd_cencus ?? row.cd_centro_custos`. Assim, os modais existentes continuam funcionando com o novo contrato sem alterar sua API.
- **Alinhamento**: valores monetários já estão à direita via `c.format === 'currency'`. Scroll horizontal já ativo (`overflow-x-auto`).

### 3. Totais
Manter o cálculo atual: usa `data.total` quando presente; caso contrário soma `Number(row.vl_realizado)` das linhas recebidas — inalterado. Como agora cada linha é um rateio já valorado, a soma continua correta e fecha com o valor do lançamento quando agrupado no ERP.

## Não alterar
Backend, endpoint, filtros, chamada `fetchDreDrill`, DRE, rateio, hook `useDreDrill`, modais de Exceção/Classificar/Criar regra.

## Validação
Abrir a DRE, drill em uma linha com `tipo_drill = LANCAMENTO`:
1. Confirmar que um lançamento rateado aparece em múltiplas linhas, uma por centro de custo.
2. Conferir coluna "Centro de Custos" preenchida (ou "SEM CENTRO" quando nula).
3. Somar visualmente as linhas de um mesmo `cd_lancamento` e checar que fecha com o valor exibido para aquele lançamento em outra granularidade (ex.: drill por Conta Contábil).
4. Filtros e demais colunas seguem funcionando.
5. Precisamos de um exemplo real com múltiplos centros de custo para reportar — sugestão: rodar o drill em uma linha de despesa e usar o log `[DRE DRILL] params` que já é impresso no console.
