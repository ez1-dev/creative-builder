# DFC Direto — visão "por período" (matriz mês × categoria) com drill em cada célula

Adiciona a terceira dimensão do fluxo de caixa realizado: além do agregado do intervalo, a evolução mês a mês, navegável célula a célula até o lançamento. Total da matriz reconcilia com o DFC Direto agregado.

## 1. `src/lib/contabil/fluxoCaixaApi.ts` — novo endpoint

Adicionar tipos e função para `GET /api/contabil/fluxo-caixa/direto/por-periodo`.

```ts
export interface DiretoPorPeriodoCelula {
  anomes: number;               // 202601 ...
  entradas: number;
  saidas: number;
  liquido: number;
  drill?: DiretoDrillPtr;       // origem + params já com anomes_ini=anomes_fim=anomes
}
export interface DiretoPorPeriodoLinha {
  categoria: string;
  atividade: AtividadeFC | string;
  celulas: DiretoPorPeriodoCelula[];    // uma por mês, na ordem de meses[]
  total_entradas: number;
  total_saidas: number;
  total_liquido: number;
  drill?: DiretoDrillPtr;               // drill agregado (opcional)
}
export interface DiretoPorPeriodoResponse {
  meses: number[];                              // ex.: [202601..202606]
  linhas: DiretoPorPeriodoLinha[];
  totais_por_mes: { anomes: number; liquido: number; entradas: number; saidas: number }[];
  variacao_liquida_total: number;               // deve bater com DiretoResponse.variacao_liquida
  [k: string]: any;
}

export function fetchDiretoPorPeriodo(params: RealizadoParams):
  Promise<DiretoPorPeriodoResponse> {
  return contabilApi.get('/api/contabil/fluxo-caixa/direto/por-periodo',
    { codemp: 1, ...params }, { timeoutMs: 60000 });
}
```

`fetchDiretoDrill` já aceita `anomes_ini`/`anomes_fim` iguais para recortar um único mês — nenhuma alteração ali.

## 2. `FluxoCaixaPage.tsx` — nova subseção na aba **Direto**

Dentro de `DiretoBloco`, abaixo da tabela de categorias agregadas já existente, adicionar seção **"Detalhe por período (mês a mês)"**:

- Nova `useQuery(['fc','direto-periodo', anomes_ini, anomes_fim, codemp, codfil], fetchDiretoPorPeriodo)`.
- Tabela: primeira coluna `CATEGORIA` (sticky-left), uma coluna por `anomes` (label via `anomesToLabel`) e coluna final `TOTAL`. Última linha `Var. do caixa` com `totais_por_mes[].liquido`.
- Cada célula (categoria × mês) mostra `liquido` (via `ValorPN`); coluna TOTAL mostra `total_liquido` da linha.
- **Drill por célula**: se `celula.drill` existir (ou construído a partir de `linha.drill.origem` + `anomes_ini=anomes_fim=celula.anomes`), clique abre `FluxoCaixaDrillDrawer` no modo `direto` com título "Categoria — mês/AA".
- **Drill por linha (TOTAL)**: reaproveita o `onOpenDrill(linha)` já existente com o intervalo completo.
- **Drill por mês (rodapé Var. do caixa)**: dropdown "Ver entradas / Ver saídas" que abre drawer com origem agregada (se backend expuser via `totais_por_mes[].drill`; caso contrário, desabilitar).
- Envolver a matriz em `FloatingHScrollbar` (já usado no DRE) para meses > 6.
- Banner de reconciliação: se `Math.abs(variacao_liquida_total - direto.variacao_liquida) > 0,01`, badge âmbar "dif." com tooltip mostrando os dois valores.

## 3. UX

- Cursor pointer + underline dotted apenas em células com `drill`.
- Formatação numérica compacta (`fmtShort`) opcional via toggle "Compacto" no cabeçalho da seção, mantendo tooltip com valor cheio.
- Linhas negativas em `text-destructive` via `ValorPN` (padrão da página).
- Estados: `Skeleton` no loading, `Alert` no erro (com `Tentar novamente`).

## Fora de escopo

- Aba Projeção e Indireto — sem mudanças.
- Exportação Excel da matriz (backend ainda não expõe).
- Alterações no `FluxoCaixaDrillDrawer` — ele já aceita drill de mês único.

## Verificação

- `tsgo` limpo.
- Smoke: /contabilidade/fluxo-caixa → aba **Direto** → matriz renderiza, `Var. do caixa` reconcilia com o card do agregado, clicar numa célula abre o drawer com lançamentos do mês.
