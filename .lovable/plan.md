
## Problema

Hoje, em algumas páginas de drill-down (Saldo em Pátio, Expedido para Obra, Produzido no Período, Relatório Semanal, Engenharia x Produção, Lead Time, Itens Não Carregados), os KPIs/cards/resumos podem ser calculados a partir de `data.dados` (apenas a página atual), o que faz os valores **mudarem ao trocar de página**.

Em outras páginas (`Saldo em Pátio`, `Expedido para Obra`, `Produzido no Período`) já existe consumo de `result.resumo`, **porém com fallback que varre todas as páginas** quando o backend não envia `resumo`, e os nomes de campos não estão padronizados (`kg_engenharia` vs `kg_engenharia_total`, `quantidade_cargas` vs `cargas_distintas`, etc).

Em `Itens Não Carregados`, `Lead Time`, `Engenharia x Produção` **não há KPIs** ainda — apenas tabela paginada e contagem `total_registros`.

## Objetivo

Padronizar a regra:

- **Tabela** = somente registros da página atual (`data.dados`).
- **KPIs / cards / drill-down gerencial** = totais globais vindos de `data.resumo` (ou `data.totais`), **nunca** somados a partir do array paginado.
- Trocar de página **não** recalcula KPIs.
- Trocar filtros recalcula KPIs (nova chamada).

## Mudanças no front-end

### 1) Helper único: `src/lib/drillResumo.ts`

```ts
export interface ResumoGerencial {
  kg_engenharia: number;
  kg_produzido: number;
  kg_expedido: number;
  kg_patio: number;
  itens_nao_carregados: number;
  quantidade_cargas: number;
  leadtime_medio_engenharia_producao: number;
  leadtime_medio_producao_expedicao: number;
  leadtime_medio_total: number;
  total_registros: number;
  // genéricos
  [k: string]: number | undefined;
}

export function normalizarResumoGerencial(resumo: any = {}): ResumoGerencial { ... }
```

Aceita aliases (`kg_engenharia_total`, `kg_entrada_estoque_total`, `total_itens_nao_carregados`, `quantidade_cargas_geral`, `cargas_distintas`, etc).

### 2) Hook `useResumoGlobal`

`src/hooks/useResumoGlobal.ts` — recebe a primeira resposta paginada e devolve `{ resumo, loading, ready }`. **Sem fallback varrendo páginas.** Se o backend não enviar `resumo`/`totais`, o hook retorna `null` e exibe aviso “Resumo gerencial indisponível neste endpoint — atualize o backend para retornar `resumo` global”.

### 3) Refatorar páginas

Em **todas** as páginas abaixo, KPIs passam a ler exclusivamente do `resumo` global da primeira chamada (não recalculados ao paginar):

- `src/pages/producao/SaldoPatioPage.tsx`
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/ProduzidoPeriodoPage.tsx`
- `src/pages/producao/RelatorioSemanalObraPage.tsx`
- `src/pages/producao/NaoCarregadosPage.tsx` (adicionar KPIs)
- `src/pages/producao/LeadTimeProducaoPage.tsx` (adicionar KPIs com lead time médio)
- `src/pages/EngenhariaProducaoPage.tsx` (adicionar KPIs Kg Eng/Prod/Exp/Pátio)
- `src/pages/NotasRecebimentoPage.tsx` (já usa `dashboard`, manter; só remover fallbacks que varriam páginas para drill)

Padrão único:

```ts
const result = await api.get(endpoint, { ...filtros, pagina, tamanho_pagina: 100 });
setData(result);                       // tabela = página atual
if (page === 1) {
  const r = normalizarResumoGerencial(result.resumo ?? result.totais);
  setResumo(r);                        // KPIs globais
}
```

Ao mudar página, apenas `setData` é chamado — `resumo` permanece intacto.

### 4) Remover fallback “consolidar todas as páginas”

Os blocos `consolidateKpis` que iteram `for (let p = 2; p <= totalPaginas; p++)` em `SaldoPatioPage`, `ExpedidoObraPage`, `ProduzidoPeriodoPage` e `RelatorioSemanalObraPage` serão removidos. Esse fluxo é o que faz KPIs flutuarem e gera carga desnecessária.

### 5) `GenericDrillView` (drill da página de Notas Recebimento)

Hoje o `GenericDrillView` agrega valores **a partir de `dados`** (array client-side com até 50k linhas amostradas). Ajustes:

- Aceitar prop opcional `resumoGlobal` para o badge superior “Total Geral”.
- O drill por nível continua somando o subset filtrado (necessário para hierarquia), mas o **rodapé/header sempre mostra o total global do `resumo`**, não o total da amostra.

## Mudanças no back-end (FastAPI externo)

Não temos acesso direto ao FastAPI a partir do Lovable, então **a entrega do plano inclui um documento de especificação** em `docs/drilldown-resumo-backend.md` com:

- Lista de endpoints que precisam retornar `resumo` global:
  - `/api/producao/patio`
  - `/api/producao/expedido-obra`
  - `/api/producao/produzido-periodo`
  - `/api/producao/relatorio-semanal-obra`
  - `/api/producao/nao-carregados`
  - `/api/producao/leadtime`
  - `/api/producao/engenharia-x-producao`
- Contrato JSON padrão:
  ```json
  {
    "pagina": 1, "tamanho_pagina": 100,
    "total_registros": 1000, "total_paginas": 10,
    "resumo": {
      "kg_engenharia": 0, "kg_produzido": 0, "kg_expedido": 0, "kg_patio": 0,
      "itens_nao_carregados": 0, "quantidade_cargas": 0,
      "leadtime_medio_engenharia_producao": 0,
      "leadtime_medio_producao_expedicao": 0,
      "leadtime_medio_total": 0
    },
    "dados": [ ... ]
  }
  ```
- Padrão SQL: `sql_resumo` sem `OFFSET/FETCH`, `sql_dados` com paginação.
- Nomes canônicos esperados pelo front (com aliases aceitos no helper).

## Critérios de aceite

1. Pesquisar 1.000 registros, 100 por página → KPIs mostram total dos 1.000.
2. Trocar de página 1 → 2 → 3 → KPIs **não mudam**.
3. Alterar filtros → KPIs recalculados (nova chamada).
4. Tabela continua paginada normalmente.
5. Nenhum KPI gerencial é somado a partir de `data.dados`.
6. Drill da página de Notas Recebimento exibe total global no header.
7. Endpoints sem `resumo` exibem aviso “Resumo gerencial indisponível” em vez de mostrar valores da página.

## Arquivos afetados

- novo: `src/lib/drillResumo.ts`
- novo: `src/hooks/useResumoGlobal.ts`
- novo: `docs/drilldown-resumo-backend.md`
- editar: `src/pages/producao/SaldoPatioPage.tsx`
- editar: `src/pages/producao/ExpedidoObraPage.tsx`
- editar: `src/pages/producao/ProduzidoPeriodoPage.tsx`
- editar: `src/pages/producao/RelatorioSemanalObraPage.tsx`
- editar: `src/pages/producao/NaoCarregadosPage.tsx`
- editar: `src/pages/producao/LeadTimeProducaoPage.tsx`
- editar: `src/pages/EngenhariaProducaoPage.tsx`
- editar: `src/components/erp/GenericDrillView.tsx` (prop `resumoGlobal`)
- editar: `src/pages/NotasRecebimentoPage.tsx` (passar resumo ao drill)
