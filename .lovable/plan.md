# Gráficos IA — Modelo Híbrido Cloud + FastAPI

## Objetivo

Reescrever o fluxo de "Gerar gráfico com IA" para separar **interpretação** (Cloud/Lovable AI) de **execução** (FastAPI). Hoje a edge function `bi-ia-chart` faz as duas coisas e ainda consulta `bi_faturamento` direto (vazia → "Nenhum dado encontrado"). No modelo novo, a base de cálculo é o ERP via FastAPI, eliminando dependência do ETL para esta feature.

## Arquitetura alvo

```text
[Usuário] → prompt PT-BR
   │
[Frontend] AiChartGenerator
   │  1) supabase.functions.invoke('bi-ia-chart-interpret', { prompt, filtros_base })
   ▼
[Edge Function bi-ia-chart-interpret]   ← só interpreta, NÃO consulta dados
   │  Lovable AI (google/gemini-3-flash-preview) + tool calling
   │  Retorna IAChartSpec validado por whitelist
   ▼
[Frontend] recebe spec
   │  2) api.post('/api/bi/comercial/ia-grafico', spec)
   ▼
[FastAPI] consulta ERP, agrega, devolve séries
   ▼
[Frontend] renderiza + drill
```

Service role nunca sai do Cloud. IA nunca gera SQL. FastAPI valida novamente os enums antes de montar a query.

## Mudanças

### 1. Edge function — virar "interpretadora pura"

Renomear/refatorar `supabase/functions/bi-ia-chart/index.ts` para `bi-ia-chart-interpret`:

- Remover: `createClient`, `fetchFromView`, `aggregate`, leitura de `v_bi_faturamento_comercial`, checagens `EMPTY_RESULT`/`EMPTY_METRIC`.
- Atualizar whitelists conforme novo contrato:
  - `METRICAS`: `faturamento | faturamento_liquido | impostos | devolucao | quantidade | clientes | vendas | ticket_medio | preco_medio`
  - `DIMENSOES`: `anomes_emissao | unidade_negocio | cd_origem | cd_tp_movimento | cd_estado | cd_cliente | cd_prj | cd_rev_pedido | cd_tns`
  - `TIPOS`: `donut | pie | bar | line`
- Chamar Lovable AI com tool `gerar_grafico` retornando o spec.
- Sanear `filtros_extras` mantendo apenas chaves da whitelist de dimensões.
- Resposta:
  ```json
  {
    "tipo_grafico": "...",
    "metrica": "...",
    "dimensao": "...",
    "filtros": { "unidade_negocio": "GENIUS", ...filtros_base saneados },
    "mostrar_percentual": true,
    "top_n": 10,
    "titulo": "...",
    "subtitulo": "..."
  }
  ```
- Continuar tratando `429` (rate limit) e `402` (créditos).

Deletar o arquivo antigo `bi-ia-chart` (ou manter o nome e só refatorar — manter o nome evita mexer no frontend). **Decisão: manter o nome `bi-ia-chart` e só refatorar o conteúdo.**

### 2. Novo cliente FastAPI

Adicionar em `src/lib/bi/iaChartApi.ts`:

- `interpretarGraficoIA(prompt, filtros_base)` → chama edge function, retorna `IAChartSpec`.
- `executarGraficoIA(spec)` → chama `api.post('/api/bi/comercial/ia-grafico', spec)`, retorna `AiChartResult` (mesmo shape já consumido pelo `AiChartGenerator`: `titulo, subtitulo, tipo_grafico, metrica, dimensao, total, series[{label,valor,percentual,filtros_drill?}], filtros`).
- `gerarGraficoIA(prompt, filtros_base)` passa a ser composição: interpretar → executar. Mantém a API pública atual para não tocar no componente.

### 3. Frontend — `AiChartGenerator.tsx`

- Atualizar `DIM_LABEL`/`METRICA_LABEL` para incluir `ticket_medio`, `preco_medio`, `cd_tp_movimento`.
- Atualizar `fmtMetrica`: `ticket_medio` e `preco_medio` usam `formatCurrency`; `clientes`/`vendas`/`quantidade` usam `formatNumber`.
- Drill continua usando `result.dimensao` + label clicado (sem mudança estrutural).

### 4. Contrato FastAPI (documentar para o backend)

Criar `docs/backend-bi-ia-grafico.md` com:

- **Endpoint:** `POST /api/bi/comercial/ia-grafico`
- **Auth:** Bearer token + `ngrok-skip-browser-warning: true` (igual aos demais).
- **Request body:** o `IAChartSpec` (mesmo JSON da edge function).
- **Validação obrigatória no backend:**
  - Rejeitar com `400` qualquer `metrica`/`dimensao`/`tipo_grafico` fora da whitelist.
  - Só aceitar chaves de `filtros` que estejam na whitelist de dimensões.
  - `top_n` clamp `[3, 30]`.
- **Cálculo:**
  - Fonte: mesma view/CTE já usada pelo BI Comercial (`VM_FATURAMENTO` consolidado).
  - `faturamento=SUM(vl_bruto)`, `faturamento_liquido=SUM(vl_liquido)`, `impostos=SUM(impostos)`, `devolucao=SUM(vl_devolucao)`, `quantidade=SUM(qtd_produtos)`.
  - `vendas=COUNT(DISTINCT id_nf)`, `clientes=COUNT(DISTINCT cd_cliente)`.
  - `ticket_medio = SUM(vl_bruto) / NULLIF(COUNT(DISTINCT id_nf),0)`.
  - `preco_medio = SUM(vl_bruto) / NULLIF(SUM(qtd_produtos),0)`.
  - Agrupar pela `dimensao`; ordenar por valor desc (exceto `anomes_emissao` que ordena por label asc).
  - Top N + bucket "Outros" (somente para dimensões não temporais).
- **Response:**
  ```json
  {
    "titulo": "...", "subtitulo": "...",
    "tipo_grafico": "...", "metrica": "...", "dimensao": "...",
    "total": 0,
    "series": [{ "label": "...", "valor": 0, "percentual": 0, "filtros_drill": {"unidade_negocio":"GENIUS","cd_estado":"SC"} }],
    "filtros": { ... }
  }
  ```
- **Erros:** `400` validação, `422` dados ausentes, `5xx` com `{error, code}`.

## Fora de escopo

- Não mexer no ETL nem na tabela `bi_faturamento` (a feature deixa de depender dela).
- Não alterar o restante do BI Comercial.
- Implementação do endpoint FastAPI é do backend — aqui entregamos apenas o doc de contrato + frontend pronto para consumir.

## Critérios de aceite

- `bi-ia-chart` (edge) responde só com o spec, sem tocar em `bi_faturamento`.
- Frontend chama FastAPI e renderiza o gráfico mesmo com `bi_faturamento` vazia.
- `metrica` fora da whitelist → bloqueada no Cloud e novamente no FastAPI.
- Drill clicável continua funcionando (passa `dimensao + label` para o handler atual).
- `docs/backend-bi-ia-grafico.md` publicado para o time de backend.
