# Calcular todas as séries RH no frontend (fallback para a Biblioteca BI)

## Objetivo

Enriquecer o `PageDataContext` de cada página RH com um conjunto completo de séries derivadas dos dados brutos já retornados pelos endpoints (`kpis`, `rows`, `mensal`, `filiais`, `detalhe`, `vencimentos`, etc.), no mesmo formato uniforme do backend:

```ts
{ chave, label, pontos: [{ label, valor }] }
```

Assim, qualquer gráfico configurável da Biblioteca BI passa a listar TODAS as séries possíveis no dropdown "Série" — mesmo quando o backend ainda não entrega o array `series[]`. Quando o backend passar a devolver `series`, elas são preservadas e apenas complementadas pelas derivadas (sem duplicar `chave`).

## Arquitetura

### 1. Novo módulo `src/lib/rh/seriesBuilders.ts`

Funções puras, uma por página, que recebem os dados brutos do dashboard e devolvem `RhSerie[]`:

```ts
buildResumoFolhaSeries(dash): RhSerie[]
buildQuadroSeries(dash): RhSerie[]
buildContratoExpSeries(dash): RhSerie[]
buildFeriasSeries(dash): RhSerie[]
buildTurnoverSeries(dash): RhSerie[]
buildAbsenteismoSeries(dash): RhSerie[]
```

Todas as agregações usam somente `rows`/coleções já presentes no payload — sem chamada nova ao backend, sem `name`/`value`/`qtd` legados.

Helper interno `groupBy(rows, keyFn, valueFn)` retorna `pontos: [{label, valor}]` ordenados por valor desc.

### 2. Merge em `RhDashboardWithBiLibrary.tsx`

Novo prop opcional `derivedSeries?: RhSerie[]`. A normalização passa a:

1. Converter `series` (backend) em `Record<chave,pontos>` + `seriesCatalog` — como já faz.
2. Adicionar cada `derivedSeries[i]` cuja `chave` ainda não existe no catálogo.
3. Passar o resultado unificado para `PageDataProvider`.

O contrato uniforme é mantido; retrocompatibilidade preservada; nada quebra se `derivedSeries` for `undefined`.

### 3. Uso em cada página RH

Cada página importa seu builder e passa:

```tsx
<RhDashboardWithBiLibrary
  series={dash.data?.series}
  derivedSeries={buildXxxSeries(dash.data)}
  ...
/>
```

`ContratoExperienciaPage.tsx` hoje usa `PageDataProvider` diretamente (não `RhDashboardWithBiLibrary`) — vamos migrar para o wrapper (ou aplicar o mesmo merge manualmente) para receber as séries derivadas.

## Séries derivadas por página

### RH-01 Resumo Folha (a partir de `mensal`, `filiais`, `proventos_vantagens`, `descontos`, `tipos_evento`)
- `custo_por_mes` — Custo Mensal por Competência
- `provento_por_mes` — Proventos por Competência
- `desconto_por_mes` — Descontos por Competência
- `liquido_por_mes` — Líquido por Competência
- `hora_extra_por_mes` — Custo Hora Extra por Competência
- `custo_por_filial` — Custo Total por Filial
- `liquido_por_filial` — Líquido por Filial
- `he_por_filial` — Hora Extra por Filial
- `beneficios_por_filial` — Benefícios por Filial
- `top_proventos` — Top 15 Proventos e Vantagens
- `top_descontos` — Top 15 Descontos
- `por_tipo_evento` — Distribuição por Tipo de Evento

### RH-02 Quadro Colaboradores (a partir de `rows` = `QuadroColaboradorItem[]`)
- `por_situacao` · `por_sexo` · `por_vinculo` · `por_escolaridade` · `por_filial` · `por_empresa` · `por_cargo` (top 20) · `por_centro_custo` (top 20) · `por_faixa_etaria` (<20, 20-29, 30-39, 40-49, 50-59, 60+) · `por_tempo_casa` (<1a, 1-3a, 3-5a, 5-10a, 10a+) · `admissoes_por_mes` (últimos 24m) · `demissoes_por_mes`

### RH-03 Contrato Experiência (a partir de `vencimentos`)
- `por_status` — Contratos por Status
- `por_empresa` — Contratos por Empresa
- `por_filial` — Contratos por Filial
- `por_cargo` — Top 15 Cargos
- `por_mes_1o_vencimento` — 1º Vencimento por Mês
- `por_mes_2o_vencimento` — 2º Vencimento por Mês
- `faixa_dias_restantes` — <=5, 6-10, 11-30, 31-60, 60+
- `faixa_dias_vencido` — 1-5, 6-15, 16-30, 30+

### RH-04 Férias (a partir de `detalhe`, `limite_ferias_pivot`, `programacao_proximos_90_dias`, `de_ferias_detalhe`)
- `por_status` · `por_empresa` · `por_filial` · `por_cargo` (top 15) · `por_mes_limite` · `por_ano_limite` · `saldo_por_faixa` (0, 1-10, 11-20, 21-30, 30+) · `programados_por_mes` · `de_ferias_por_empresa`

### RH-05 Turnover (a partir de `por_mes`, `por_motivo`, `por_empresa`, `detalhe_*`)
- `admitidos_por_mes` · `demitidos_por_mes` · `saldo_por_mes` · `por_motivo` · `admitidos_por_empresa` · `demitidos_por_empresa` · `admitidos_por_cargo` (top 15) · `demitidos_por_cargo` (top 15) · `admitidos_por_filial` · `demitidos_por_filial`

### RH-06 Absenteísmo (a partir de `por_categoria`, `por_motivo`, `por_mes`, `por_empresa`, `detalhe`)
- `dias_por_categoria` · `afastamentos_por_categoria` · `colab_por_categoria` · `dias_por_mes` · `afastamentos_por_mes` · `dias_por_empresa` · `afastamentos_por_empresa` · `dias_por_motivo` (top 15) · `dias_por_cargo` (top 15) · `dias_por_filial` · `duracao_media_por_categoria`

## Regras que serão respeitadas

- Nenhuma nova chamada de API; agregação 100% frontend.
- Séries do backend têm prioridade — `derivedSeries` só preenchem `chave` que não existir.
- Formato uniforme `{ chave, label, pontos: [{label, valor}] }` — sem `name`/`value`/`qtd`/`total`.
- `pageRegistry` schemas permanecem apenas como fallback quando `seriesCatalog` estiver vazio.
- `ContratoExperienciaPage` migra para `RhDashboardWithBiLibrary` (ou recebe o mesmo merge no `PageDataProvider` local) para expor o dropdown "Série".

## Arquivos afetados

- **criar** `src/lib/rh/seriesBuilders.ts`
- **editar** `src/components/rh/RhDashboardWithBiLibrary.tsx` (novo prop `derivedSeries` + merge)
- **editar** `src/pages/rh/ResumoFolhaPage.tsx`
- **editar** `src/pages/rh/QuadroColaboradoresPage.tsx`
- **editar** `src/pages/rh/ContratoExperienciaPage.tsx` (passar a usar o wrapper ou aplicar merge local)
- **editar** `src/pages/rh/ProgramacaoFeriasPage.tsx`
- **editar** `src/pages/rh/TurnoverPage.tsx`
- **editar** `src/pages/rh/AbsenteismoPage.tsx`
