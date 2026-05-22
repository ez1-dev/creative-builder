## Diagnóstico

Em `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`, a função `visualizarSelecionadas` (linhas ~622-680) monta o payload de cada OP do lote repassando os filtros **`cod_etg` (Estágio)** e **`cod_cre` (Centro de Recurso)** que estão no formulário de busca:

```ts
if (filtros.cod_etg) payload.cod_etg = filtros.cod_etg;
if (filtros.cod_cre) payload.cod_cre = filtros.cod_cre;
```

Esses dois filtros têm a função de **restringir a lista de OPs** retornada pela busca, mas o backend de impressão (`/api/producao/ordem-producao/impressao`) os usa também para **filtrar internamente os componentes e operações** retornados de cada OP individual.

Resultado:
- Se a OP 125 tem componentes em estágios diferentes do `cod_etg` filtrado (ou operações em outro `cod_cre`), o backend devolve `componentes: []` e o `OpPrintSheet` renderiza a OP sem o bloco "Relação de Componentes".
- A impressão individual via clique direto na linha às vezes funciona porque o usuário pode estar limpando o filtro antes, ou clicando em uma OP cujo estágio bate com o filtro — comportamento inconsistente.

A confirmação do usuário ("uso seleção múltipla, com Estágio/Centro de Recurso preenchidos") fecha o diagnóstico.

## Correção

Os filtros `cod_etg` e `cod_cre` servem apenas para **encontrar** as OPs na grade. Uma vez selecionadas as OPs, a impressão de cada uma deve ser **completa** (todos os componentes, todas as operações), independente do filtro usado na busca.

### Alterações

**1) `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` — `visualizarSelecionadas` (~linhas 642-652)**

Remover o repasse de `cod_etg` e `cod_cre` no payload por OP do lote:

```ts
const payload: Record<string, any> = {
  cod_emp: Number(op.cod_emp ?? filtros.cod_emp),
  cod_ori: String(op.cod_ori ?? ''),
  num_orp: Number(op.num_orp ?? 0),
  listar_componentes,
  listar_desenho,
  quebrar_por_operacao: filtros.quebrar_por_operacao === 'S' ? 'S' : 'N',
};
// NÃO repassar cod_etg / cod_cre — esses filtros são da busca da lista,
// não devem restringir o conteúdo (componentes/operações) de cada OP.
if (filtros.incluir_desenhos === 'S') payload.incluir_desenhos = 'S';
```

**2) `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` — `handleRowSelect` (~linhas 536-548)**

Aplicar a mesma regra na impressão individual via clique na linha, para manter coerência (hoje também passa `cod_etg`/`cod_cre` da tela e poderia esconder componentes silenciosamente):

```ts
const eff: ImpressaoOpFiltros = {
  cod_emp,
  cod_ori,
  num_orp,
  listar_componentes: 'S',
  listar_desenho: 'N',
  incluir_desenhos: 'S',
  quebrar_por_operacao: filtros.quebrar_por_operacao === 'S' ? 'S' : 'N',
  // cod_etg / cod_cre intencionalmente NÃO repassados
};
```

**3) `imprimirTodas` (~linhas 588-600) — manter como está**

Esse fluxo chama `/impressao/lote` no backend, e os filtros `cod_etg`/`cod_cre` ali servem justamente para **escolher quais OPs entram no lote** — devem continuar sendo enviados.

## Escopo

- Apenas a página de Impressão de Ordem de Produção.
- Sem alteração no backend, no `OpPrintSheet`, no CSS, no quadro REV ou no layout dos blocos de apontamento.
- Sem mudança em outros módulos.

## Validação esperada

1. Aplicar filtro Estágio = 2000 (ou outro), buscar OPs, selecionar várias incluindo a 125, clicar em "Visualizar selecionadas".
2. A OP 125 deve aparecer com a "Relação de Componentes Necessários" preenchida — igual à impressão individual.
3. Repetir com filtro de Centro de Recurso para confirmar.
