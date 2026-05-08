
# Shadow mode: endpoints BI paralelos + aba Validação consumindo `/api/bi/validar-*`

Não vamos trocar nenhum dashboard agora. A flag `USE_BI_ANALYTICS` fica para depois. Esta etapa cria endpoints **paralelos** `/api/bi/*` (lendo só `bi_compras`/`bi_recebimentos`) e endpoints de comparação `/api/bi/validar-*`. O frontend ganha uma aba Validação que consome esses endpoints e mostra ERP × BI lado a lado.

---

## 1. Backend FastAPI (fora do Lovable, lista de tarefas para o time)

Criar, **sem alterar** os endpoints atuais:

| Novo endpoint                              | Fonte             | Espelha contrato de                          |
|--------------------------------------------|-------------------|----------------------------------------------|
| `GET /api/bi/painel-compras`               | `bi_compras`      | `/api/painel-compras`                        |
| `GET /api/bi/painel-compras-dashboard`     | `bi_compras`      | `/api/painel-compras-dashboard`              |
| `GET /api/bi/notas-recebimento`            | `bi_recebimentos` | `/api/notas-recebimento`                     |
| `GET /api/bi/notas-recebimento-dashboard`  | `bi_recebimentos` | `/api/notas-recebimento-dashboard`           |
| `GET /api/export/bi/painel-compras`        | `bi_compras`      | `/api/export/painel-compras`                 |
| `GET /api/export/bi/notas-recebimento`     | `bi_recebimentos` | `/api/export/notas-recebimento`              |
| `GET /api/bi/validar-painel-compras`       | ambas             | resposta `{erp, bi, diferencas, filtros}`    |
| `GET /api/bi/validar-notas-recebimento`    | ambas             | idem                                         |

Endpoints legacy continuam intocados, lendo do ERP.

### Contrato dos `/api/bi/validar-*`

Aceitam os mesmos query params do dashboard correspondente (`data_inicio`, `data_fim`, `tipo_despesa`, `somente_pendentes`, `fornecedor`, `projeto_macro`, etc.) e devolvem:

```json
{
  "filtros": { "...": "..." },
  "erp": { "valor_bruto": 0, "valor_liquido": 0, "valor_pendente": 0,
           "qtd_ocs": 0, "qtd_itens": 0, "qtd_fornecedores": 0 },
  "bi":  { "valor_bruto": 0, "valor_liquido": 0, "valor_pendente": 0,
           "qtd_ocs": 0, "qtd_itens": 0, "qtd_fornecedores": 0 },
  "diferencas": { "valor_bruto": 0, "valor_liquido": 0, "valor_pendente": 0,
                  "qtd_ocs": 0, "qtd_itens": 0, "qtd_fornecedores": 0 }
}
```

Para recebimentos: trocar `valor_pendente`/`qtd_ocs` por `valor_total`/`qtd_nfs`. Regra: `diferencas[k] = bi[k] - erp[k]`.

### Caso obrigatório de validação

```
?data_inicio=2026-01-01&data_fim=2026-01-31&tipo_despesa=MATERIA_PRIMA&somente_pendentes=true
```

Os 6 KPIs precisam bater ou ter divergência explicável.

---

## 2. Mudanças no Lovable (este loop, modo build)

### 2.1 `docs/backend-etl-bi.md`

Adicionar seção **"Shadow mode — endpoints `/api/bi/*` paralelos"** com:
- Tabela dos 8 endpoints novos.
- Contrato dos `/api/bi/validar-*` (JSON acima).
- Caso obrigatório de validação (Matéria-prima + somente pendentes).
- Ordem do cutover faseado pós-validação: dashboards → listas → exports → watermark, mantendo fallback ERP por 7 dias.

### 2.2 `src/pages/EtlAdminPage.tsx` — aba Validação

Refatorar a aba **Validação** (que hoje compara `bi_*` direto via supabase-js × dashboards atuais) para passar a consumir `/api/bi/validar-painel-compras` e `/api/bi/validar-notas-recebimento`. Vantagens: a aritmética (qtd_ocs distinct, qtd_fornecedores distinct, somente_pendentes) fica no FastAPI usando o mesmo motor de filtros, evitando reimplementar lógica no frontend.

Mudanças concretas:
- Trocar `compararComErp` por `Promise.all` chamando `api.get('/api/bi/validar-painel-compras', filtros)` e `api.get('/api/bi/validar-notas-recebimento', filtros)`.
- Adicionar campos de filtro extras no formulário: `tipo_despesa` (select MATERIA_PRIMA/USO_CONSUMO/DESPESAS_GERAIS/SERVICOS/—), `somente_pendentes` (switch), `projeto_macro` (select GENIUS/ESTRUTURAL ZORTEA/OUTROS/—).
- Renderizar tabela 3 colunas (ERP / BI / Diff) com os 6 KPIs, sinalizados verde (<0,5%) / amarelo (<2%) / vermelho (≥2%).
- Botão de atalho "Caso obrigatório (jan/2026, Matéria-prima, pendentes)" que preenche os filtros.
- Manter os 2 cards "bi_compras / bi_recebimentos — últimos meses" lendo direto do Cloud (úteis para ver se o ETL populou).
- Manter os cards de "Última execução" por tarefa.
- Tratar resposta de erro do FastAPI (404/500) com mensagem amigável "Endpoint /api/bi/validar-* não disponível ainda no backend".

### 2.3 Sem mudança em outros lugares

- `useDashboardData`, `PainelComprasPage`, `NotasRecebimentoPage`, exportações: **não tocar**. Continuam usando os endpoints atuais.
- Nenhuma migração no Cloud.
- Sem flag `USE_BI_ANALYTICS` no frontend ainda — ela vive só no backend e só é ligada na próxima fase.

---

## 3. Sequência operacional (depois do build)

1. Time do FastAPI implanta os 8 endpoints novos.
2. Disparar via aba `/etl` → Ações:
   - `ATU_COMPRAS` 2026-01-01 → 2026-01-31.
   - `ATU_RECEBIMENTOS` 2026-01-01 → 2026-01-31.
3. Conferir contagens em `/etl` → Validação (cards mensais).
4. Rodar o caso obrigatório (botão de atalho) e checar os 6 KPIs.
5. Se diff ≤ 0,5% em 2 janelas: marcar fase 1 do cutover como pronta (próximo loop liga a flag, começando pelos endpoints `*-dashboard`).
6. Se diff > 0,5%: abrir tarefa de correção (geralmente projeto_macro, tipo_despesa_calc ou filtro `somente_pendentes` divergindo).

---

## 4. O que NÃO fazer neste loop

- Não trocar `/api/painel-compras` nem `/api/notas-recebimento` para `bi_*`.
- Não remover queries do ERP.
- Não ligar `USE_BI_ANALYTICS`.
- Não mexer em exportações dos painéis.
- Não criar edge function: tudo isso vive no FastAPI externo, não no Lovable Cloud.

