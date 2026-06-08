# Expandir drills do BI Comercial

## Situação atual

O menu de clique-direito (`ChartContextMenu` → "Detalhar em…") usa `NEXT_DRILLS[drill_type]` do catálogo. Hoje só existem 8 níveis: `ACUMULADO, MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, NOTA_FISCAL, DETALHES_IMPOSTOS`.

A print mostra um menu com **Cliente, Estado, Mensal, Nota Fiscal, Obra, Projeto, Tipo Serviço** — então:

1. Faltam no menu: **Revenda, Produto, Acumulado, Detalhes Impostos** (já existem no backend, só não aparecem para esse gráfico de origem).
2. Não existem ainda como drill: **Obra (`cd_prj`)**, **Projeto** e **Tipo Serviço (`cd_tns` / `cd_tp_movimento`)** — exigem mudanças no backend FastAPI (`/api/bi/comercial/drill`).

## Parte 1 — Frontend: exibir todos os drills compatíveis (sem backend)

Ajustar `NEXT_DRILLS` em `src/lib/bi/comercialDrillCatalog.ts` para que **todo nível ofereça todos os outros como destino** (exceto ele mesmo e `ACUMULADO` só fora dele mesmo). Hoje há podas arbitrárias — ex.: `PRODUTO` só leva a `NOTA_FISCAL`/`DETALHES_IMPOSTOS`. Vamos liberar a navegação livre, pois o backend já aceita qualquer combinação de filtros via `contexto`.

Novo `NEXT_DRILLS` (cada nível → todos os outros, na ordem do catálogo):

```text
ACUMULADO  → MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, OBRA, PROJETO, TIPO_SERVICO, NOTA_FISCAL, DETALHES_IMPOSTOS
MENSAL     → ESTADO, CLIENTE, REVENDA, PRODUTO, OBRA, PROJETO, TIPO_SERVICO, NOTA_FISCAL, DETALHES_IMPOSTOS
ESTADO     → MENSAL, CLIENTE, REVENDA, PRODUTO, OBRA, PROJETO, TIPO_SERVICO, NOTA_FISCAL, DETALHES_IMPOSTOS
CLIENTE    → MENSAL, ESTADO, REVENDA, PRODUTO, OBRA, PROJETO, TIPO_SERVICO, NOTA_FISCAL, DETALHES_IMPOSTOS
REVENDA    → MENSAL, ESTADO, CLIENTE, PRODUTO, OBRA, PROJETO, TIPO_SERVICO, NOTA_FISCAL, DETALHES_IMPOSTOS
PRODUTO    → MENSAL, ESTADO, CLIENTE, REVENDA, OBRA, PROJETO, TIPO_SERVICO, NOTA_FISCAL, DETALHES_IMPOSTOS
NOTA_FISCAL→ MENSAL, ESTADO, CLIENTE, REVENDA, PRODUTO, OBRA, PROJETO, TIPO_SERVICO, DETALHES_IMPOSTOS
```

Os três novos (OBRA, PROJETO, TIPO_SERVICO) só são exibidos no menu **após** o backend respondê-los (ver Parte 2). Até lá, ficam ocultos via *feature flag* simples: constante `ENABLED_DRILLS` em `comercialDrillCatalog.ts` que filtra `NEXT_DRILLS`. Quando o backend for entregue, basta ligar.

## Parte 2 — Novos níveis: Obra, Projeto, Tipo Serviço

### Decisão de modelo

- **Obra** = agrupar por `cd_prj` (já existe como filtro). Label vem da dimensão `bi_projetos` (já no Cloud).
- **Projeto** = `cd_prj` **mais** descrição longa do projeto. Se for o mesmo agrupador que Obra, **escolher um único nome** para não duplicar (sugestão: manter só "Obra" e dropar "Projeto"). Confirmar abaixo.
- **Tipo Serviço** = agrupar por `cd_tns` (Transação) **ou** `cd_tp_movimento`. Precisa decisão.

### Frontend (depois do backend pronto)

1. `comercialDrillApi.ts` — adicionar tipos novos em `DrillType`:
   ```ts
   'OBRA' | 'TIPO_SERVICO'   // + 'PROJETO' se mantido
   ```
2. `comercialDrillCatalog.ts`:
   - `DRILL_LABELS`: `OBRA: 'Obra'`, `TIPO_SERVICO: 'Tipo Serviço'`.
   - `ROW_TO_CTX_KEY`: `OBRA: 'cd_prj'`, `TIPO_SERVICO: 'cd_tns'`.
   - `ALLOWED_CTX_KEYS`: definir quais chaves o nível aceita herdar (padrão: tempo + UF + cliente + revenda + origem + categoria + a própria chave).
   - `NEXT_DRILLS`: incluir nas listas acima.
3. `comercialDrillContract.ts` / `cleanContexto`: garantir que `cd_prj` e `cd_tns` sigam compactados.
4. `ComercialDrillDrawer.tsx`: já é genérico — só precisa renderizar as colunas que o backend devolver. Nenhuma mudança específica.

### Backend (`docs/backend-bi-comercial-drills-novos.md` — novo)

Endpoint inalterado: `POST /api/bi/comercial/drill`. Aceitar três novos valores em `drill_type`:

| drill_type    | Agrupador                | Colunas mínimas devolvidas                                                                 |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `OBRA`        | `cd_prj`                 | `cd_prj`, `ds_projeto` (via `bi_projetos`), métricas (`fat_bruto`, `fat_liquido`, `qtde`, `nfs`) |
| `TIPO_SERVICO`| `cd_tns` (+ `cd_tp_movimento` opcional) | `cd_tns`, `ds_tns`, métricas idem                                                          |

- `filtros_drill` de cada linha: **somente** a chave agrupadora (`{ cd_prj }` ou `{ cd_tns }`), seguindo o padrão já em vigor para `PRODUTO`/`CLIENTE`.
- `ALLOWED_CTX_KEYS` herdadas: tempo (`anomes_emissao`), `cd_estado`, `cd_cliente`, `cd_rev_pedido`, `cd_origem`, `categoria_custom`, e a própria chave do nível.
- LEFT JOIN com `bi_projetos` (Obra) — `bi_projetos` já existe no Cloud, mas o backend acessa via réplica/ETL. Se a descrição de TNS não estiver disponível, devolver só `cd_tns`.
- Diagnóstico: acrescentar `qtd_linhas_apos_obra` (já existe) e `qtd_linhas_apos_tns` (já existe).

Sem migração no Cloud — `bi_projetos` já tem `cd_prj`/`ds_projeto`. Para TNS, se quiser descrição, criar `bi_tns` em outro plano (não escopo agora).

## Mudanças por arquivo

1. **`src/lib/bi/comercialDrillCatalog.ts`** — reescrever `NEXT_DRILLS` (todos × todos), adicionar `ENABLED_DRILLS` para gating dos novos. Quando os 3 novos forem habilitados, atualizar `DRILL_LABELS`, `ROW_TO_CTX_KEY`, `ALLOWED_CTX_KEYS`.
2. **`src/lib/bi/comercialDrillApi.ts`** — expandir union `DrillType` com `'OBRA' | 'TIPO_SERVICO'` (gated).
3. **`src/components/bi/runtime/ChartContextMenu.tsx`** — aplicar filtro `ENABLED_DRILLS` ao `nextList`.
4. **`docs/backend-bi-comercial-drills-novos.md`** (novo) — contrato para a equipe de backend.
5. **`mem/features/drill-bi-comercial.md`** — atualizar pilha e regras de `filtros_drill`.

## Perguntas a confirmar antes de implementar

1. **Projeto vs Obra**: são a mesma coisa (`cd_prj`)? Posso manter apenas "Obra" e dropar "Projeto" do menu?
2. **Tipo Serviço**: agrupar por `cd_tns` (transação) ou `cd_tp_movimento` (tipo de movimento)?
3. Os três novos drills exigem trabalho no FastAPI. Implemento já a Parte 1 (liberar todos os drills existentes no menu) e deixo Parte 2 documentada para o backend, ou aguardo o backend ficar pronto antes de qualquer mudança?

## Fora de escopo

- Criar `bi_tns` ou sincronizar TNS do ERP (plano separado se quiser nome do serviço).
- Mudar `ComercialDrillDrawer` — ele já é dimensão-agnóstico.
- Cross-filter por essas novas chaves (já funciona automaticamente quando o backend devolver `filtros_drill`).

## Critério de aceite

- Menu "Detalhar em…" passa a mostrar **todos os drills existentes** a partir de qualquer gráfico (Parte 1, sem backend).
- Após Parte 2, clicar em "Obra" / "Tipo Serviço" abre o drawer com a grid agrupada e permite continuar drillando para qualquer outro nível.
