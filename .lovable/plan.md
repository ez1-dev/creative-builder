# Endpoint agregado de Notas Fiscais de Recebimento

## Objetivo
Eliminar o teto de 50.000 linhas e o aviso de amostragem nos KPIs/gráficos/drill da tela `Notas Fiscais de Recebimento`, passando o cálculo dos agregados para um novo endpoint FastAPI que roda no banco, sem paginação.

A `Lista Detalhada` continua exatamente como está hoje (paginada por `/api/notas-recebimento`).

## Parte 1 — Backend FastAPI (fora deste repositório)

Será entregue como especificação para o time do ERP através do documento `docs/backend-notas-recebimento-dashboard.md`. A implementação acontece no projeto FastAPI, não aqui.

**Novo endpoint:** `GET /api/notas-recebimento-dashboard`

- Reaproveita exatamente a mesma query base e os mesmos filtros aceitos por `/api/notas-recebimento`.
- **NÃO** usa `LIMIT`, `OFFSET`, `pagina` nem `tamanho_pagina`.
- Filtros que devem afetar todos os cálculos: `tipo_despesa`, `projeto`, `centro_custo`, `fornecedor`, `transacao_nf`, `condicao_pagamento`, `data_emissao_ini/fim`, `data_recebimento_ini/fim`, `mes_competencia`, `numero_nf`, `serie_nf`, `numero_oc_origem`, `familia`, `origem`, `deposito`, `projeto_macro`, `valor_min/max`, `tipo_item`, `situacao_nf`.
- Todos os KPIs, buckets de gráficos e linhas de drill são calculados via `GROUP BY` no SQL sobre o resultado filtrado completo.

**Formato da resposta:**
```json
{
  "kpis": {
    "valor_recebido": 0,
    "quantidade_nfs": 0,
    "quantidade_itens": 0,
    "quantidade_fornecedores": 0,
    "valor_medio_nf": 0
  },
  "graficos": {
    "por_mes": [{ "mes": "2026-01", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_tipo_despesa": [{ "tipo": "Matéria-prima", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_centro_custo": [{ "centro_custo": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_projeto": [{ "projeto": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_fornecedor": [{ "fornecedor": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_transacao_nf": [{ "transacao": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }]
  },
  "drill": [
    { "projeto_macro": "Genius", "tipo_despesa": "Matéria-prima", "projeto": "...", "centro_custo": "...", "fornecedor": "...", "transacao": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }
  ]
}
```

`quantidade_nfs` = `COUNT(DISTINCT numero_nf || serie_nf || fornecedor)`. `quantidade_itens` = `COUNT(*)` de itens.

## Parte 2 — Documentação

Criar `docs/backend-notas-recebimento-dashboard.md` com:
- contrato acima
- lista de filtros aceitos (idêntica a `/api/notas-recebimento`)
- exemplos de SQL agregado por bucket
- nota: endpoint **sem paginação**, usar `application/json` direto

## Parte 3 — Frontend (`src/pages/NotasRecebimentoPage.tsx`)

1. **Substituir o segundo request agregado** (hoje em `search()`, lines ~244-259) que chama `/api/notas-recebimento` com `tamanho_pagina=50000` por uma chamada a `/api/notas-recebimento-dashboard` (sem `pagina`/`tamanho_pagina`).
2. Novo estado `dashboard` (tipo `NotasRecebimentoDashboardResponse`) substitui `dadosAgregados` para alimentar KPIs/gráficos/drill.
3. KPIs passam a vir direto de `dashboard.kpis` — remover o cálculo client-side via `dados.reduce(...)`.
4. Gráficos passam a usar `dashboard.graficos.*` — remover os `useMemo` que agrupam por mês/tipo/projeto/fornecedor/centro_custo/transacao client-side.
5. Drill-down usa `dashboard.drill` no `<GenericDrillView>` (com fallback para `dados` caso o backend ainda não esteja deployado).
6. **Remover `TAMANHO_AGREGADO = 50000`** e o estado `amostragemAtiva` + chip amarelo de aviso (lines ~302-303 e ~465).
7. **Manter intacto**:
   - `/api/notas-recebimento` paginado (alimenta `<DataTable data={dadosLista}>`).
   - `exportParams` para o `<ExportButton>`.
   - Filtros client-side (`filtroCliente`) para o caso do endpoint legado ainda em uso.
8. **Compatibilidade graceful**: se a chamada ao novo endpoint falhar com 404, cair de volta no comportamento atual (segundo request paginado com `tamanho_pagina=50000`) e logar warning. Isso permite deploy do front antes do backend.
9. Adicionar tipo em `src/lib/api.ts`:
   ```ts
   export interface NotasRecebimentoDashboardResponse {
     kpis: { valor_recebido: number; quantidade_nfs: number; quantidade_itens: number; quantidade_fornecedores: number; valor_medio_nf: number };
     graficos: { por_mes: any[]; por_tipo_despesa: any[]; por_centro_custo: any[]; por_projeto: any[]; por_fornecedor: any[]; por_transacao_nf: any[] };
     drill: any[];
   }
   ```

## Resultado
- KPIs/gráficos/drill sempre refletem a base completa filtrada (sem teto de 50k, sem amostragem).
- Lista Detalhada continua paginada e independente.
- Trocar página da tabela não recalcula agregados.
- Trocar filtro recalcula tudo via novo endpoint.
- Frontend tolera backend ainda não atualizado (fallback transparente).
