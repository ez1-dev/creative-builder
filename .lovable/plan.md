## Refatorar `bi-ia-chart` para consultar Supabase direto (sem FastAPI)

### Objetivo
Remover a dependência de `GET /api/bi/comercial/detalhes` na geração inicial do gráfico IA. A Edge Function passa a ler diretamente a view `public.v_bi_faturamento_comercial` no Cloud, agrega no servidor e retorna o JSON pronto para o frontend renderizar.

### Descoberta importante (schema real da view)
Confirmei via `information_schema` que `public.v_bi_faturamento_comercial` existe, mas **não** contém todas as colunas listadas no pedido. Colunas reais:

`id, id_nf, cd_nf, cd_cliente, cd_estado, cd_cidade, cd_prj, ds_abr_prj, cd_fpj, ds_abr_fpj, cd_grupo_cliente, cd_representante, cd_tns, dt_emissao, ano_emissao, anomes_emissao, mes_emissao, fonte_acao, unidade_negocio, qtd_produtos, vl_bruto, vl_devolucao, impostos, vl_liquido`

Ajustes obrigatórios em relação ao pedido original:
- **Métrica `impostos`** → soma da coluna `impostos` (não existe `vl_impostos`).
- **Dimensões não disponíveis na view**: `cd_origem`, `cd_tp_movimento`, `cd_rev_pedido`. Vou **removê-las do enum** aceito pela IA e ensiná-la no system prompt a usar substitutos quando o usuário pedir:
  - "Peças vs Serviços" / "máquinas vs serviços" / "origem" → usar `fonte_acao` (campo equivalente já populado pela camada analítica).
  - "Revenda" → usar `ds_abr_fpj` ou `cd_fpj` (forma comercial = revenda no modelo atual).
  - "Tipo de movimento" → não suportado; IA deve responder com erro amigável "dimensão não disponível".
- **Dimensões finais permitidas**: `anomes_emissao, unidade_negocio, fonte_acao, cd_estado, cd_cliente, cd_prj, cd_fpj, cd_tns, cd_grupo_cliente, cd_representante`.
- **Métricas finais permitidas**: `faturamento (vl_bruto)`, `faturamento_liquido (vl_liquido)`, `impostos (impostos)`, `devolucao (vl_devolucao)`, `quantidade (qtd_produtos)`, `clientes (count distinct cd_cliente)`, `vendas (count distinct id_nf)`.

> Vou confirmar essa adaptação dos nomes com você antes de codar — ver "Perguntas" no fim.

### Alterações de código

**Arquivo único:** `supabase/functions/bi-ia-chart/index.ts` (rewrite parcial). Sem mudanças no frontend (`AiChartGenerator.tsx`, `iaChartApi.ts`) — o contrato de resposta é mantido e estendido com `filtros_drill` por série.

1. **Remover** `fetchDetalhes()` e toda a validação de `FASTAPI_BASE_URL`. A função não chama mais a FastAPI.
2. **Adicionar** cliente Supabase (service role, server-side only):
   ```ts
   import { createClient } from "npm:@supabase/supabase-js@2";
   const sb = createClient(
     Deno.env.get("SUPABASE_URL")!,
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
     { auth: { persistSession: false } },
   );
   ```
   Service role fica **apenas no edge** — nunca exposto ao browser (já é regra do projeto).
3. **Atualizar `callLovableAI`**:
   - Novos enums (métricas/dimensões acima).
   - Adicionar campo `mostrar_percentual: boolean` à tool schema.
   - Atualizar system prompt em PT-BR com mapeamentos (Genius → `unidade_negocio=GENIUS`; Peças/Serviços → `dimensao=fonte_acao`; etc.).
   - Validar duramente o retorno: se a IA inventar dimensão/métrica fora do enum, cair para padrão seguro (faturamento por unidade_negocio).
4. **Nova função `fetchFromView(filtros, dimensao, metrica)`**:
   - `let q = sb.from("v_bi_faturamento_comercial").select(SELECT_MIN)`.
   - `SELECT_MIN` inclui apenas as colunas necessárias (`dimensao`, `cd_cliente`, `id_nf`, e a coluna numérica da métrica) — reduz payload.
   - Aplicar filtros com `.eq()` apenas para chaves **dentro do enum de dimensões permitidas** (whitelist; rejeita silenciosamente chaves desconhecidas — nada de SQL livre).
   - `.limit(50000)` como teto duro.
   - Paginar via `range()` se necessário (loop até `count < pageSize`) — view pode ter mais de 1000 linhas; PostgREST default limita.
5. **Função `aggregate()`** (reaproveitar a existente, adaptando):
   - Buckets por valor da dimensão.
   - Métrica:
     - `faturamento` → `sum(vl_bruto)`
     - `faturamento_liquido` → `sum(vl_liquido)`
     - `impostos` → `sum(impostos)`
     - `devolucao` → `sum(vl_devolucao)`
     - `quantidade` → `sum(qtd_produtos)`
     - `vendas` → `count distinct id_nf`
     - `clientes` → `count distinct cd_cliente`
   - Ordenar desc, aplicar `top_n` (3–30) + bucket "Outros".
   - Calcular percentual.
   - **Novo campo por série**: `filtros_drill` = `{ ...filtrosBase, [dimensao]: label }` (omitido para "Outros").
6. **Resposta**:
   ```json
   {
     "titulo": "...",
     "subtitulo": "...",
     "tipo_grafico": "donut|pie|bar|line",
     "metrica": "...",
     "dimensao": "...",
     "total": 0,
     "series": [{ "label", "valor", "percentual", "filtros_drill" }],
     "filtros": { ...mergedFiltros }
   }
   ```
7. **Erros amigáveis** (sem `userFacing: false`):
   - Sem dados após agregação → `{ error: "Nenhum dado encontrado para os filtros informados.", code: "EMPTY_RESULT" }` com status 200.
   - Métrica/dimensão inválidas → fallback silencioso para padrão (já tratado em (3)).
   - Erro do Supabase → `code: "SUPABASE_QUERY_ERROR"`, status 200, mensagem amigável.

### Segurança
- Service role nunca sai do edge.
- **Sem SQL dinâmico**: apenas `.from(view).select().eq()` com chaves whitelisted.
- IA só escolhe entre enums fixos; valores inválidos são substituídos antes da query.
- Limite duro de 50k linhas + paginação controlada para evitar OOM.
- Prompt limitado a 1000 chars (já existente).

### Frontend (sem mudanças)
- `AiChartGenerator.tsx` segue chamando `gerarGraficoIA(prompt, filtrosBase)`.
- O drill continua via `onDrill(dimensao, label)` — clica numa fatia e o BI Comercial aplica o filtro localmente (chamando a FastAPI no detalhamento, como hoje). Sem mudanças.
- O campo extra `filtros_drill` na série é opcional para o consumidor; pode ser usado pelo `AiChartGenerator` futuramente para passar drill mais rico, mas não exige refactor agora.

### Critério de aceite
- `bi-ia-chart` não chama mais `FASTAPI_BASE_URL`.
- Prompt "gráfico de rosca do faturamento da Genius por Peças e Serviços" retorna 200 com `tipo_grafico=donut`, `metrica=faturamento`, `dimensao=fonte_acao`, série com PEÇAS e SERVIÇOS e `total > 0`.
- Quando não há linhas, retorna mensagem amigável sem 500.
- Logs do edge não mostram chamada para `ngrok` / FastAPI.

### Fora de escopo
- Drill-down (continua FastAPI).
- Mudanças no frontend além de tipos opcionais.
- Mudanças nas views/tabelas analíticas.

### Perguntas (preciso de confirmação antes de codar)

1. **Mapeamento de dimensões ausentes na view** — a view `v_bi_faturamento_comercial` **não tem** `cd_origem`, `cd_tp_movimento` nem `cd_rev_pedido`. Posso usar:
   - `cd_origem` → `fonte_acao` (sim/não)
   - `cd_rev_pedido` → `cd_fpj` / `ds_abr_fpj` (sim/não)
   - `cd_tp_movimento` → remover do enum (sim/não)

2. **Métrica `impostos`** — usar a coluna `impostos` da view (não existe `vl_impostos`). OK?

Se preferir, posso seguir com esse mapeamento como padrão e você ajusta depois. Me confirma com "ok" ou diga o que mudar.
