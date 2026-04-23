

## Corrigir respostas de "totais agregados" do Assistente IA (ex.: "quantas OCs em aberto?")

### Problema
Pergunta: **"quantas ordens de compra temos em aberto?"** (intenção: total geral do ERP)

Resposta atual: *"Com base nos filtros aplicados na tela atual (OC 40701, somente_pendentes), temos 13 itens em aberto."*

A IA está respondendo com base no **CONTEXTO DA PÁGINA** (que tem filtros locais) em vez de fazer uma consulta global. Além disso, mesmo se chamasse `query_erp_data`, ela retornaria **linhas de OC** (cada item) em vez de **OCs distintas**, e o `top_n` máximo de 50 mascara o total real.

### Causas raiz

1. **Prompt enviesado para o contexto da página**: a regra atual diz *"Quando o usuário fizer uma pergunta analítica sobre a tela atual, responda diretamente em texto, usando o CONTEXTO DA PÁGINA"*. A IA aplica isso a perguntas globais ("quantas OCs no total?") porque não há critério para diferenciar **escopo local vs global**.

2. **`query_erp_data` não retorna agregados**: a tool foi desenhada para "top N ordenado". Para perguntas de **contagem** (`COUNT DISTINCT numero_oc`), ela:
   - Devolve no máximo 50 registros.
   - Reporta `total_in_dataset` = linhas (não OCs únicas).
   - Não tem modo "só me dê o total".

3. **Não há `count_only` / `aggregate`**: hoje qualquer pergunta tipo "quantos X?" precisa que a IA invente uma estimativa a partir dos top N.

4. **Painel de Compras tem 1 OC = N linhas**: o backend retorna 1 linha por item da OC. "13 itens" da OC 40701 ≠ "13 OCs". A tool precisa saber agrupar por chave (`numero_oc`).

### Solução

#### 1) Adicionar modo agregado em `query_erp_data`

Novos parâmetros opcionais na tool (em `aiQueryExecutor.ts` e na definição da edge function):

- **`aggregate`**: `'count' | 'count_distinct' | 'sum' | 'avg'` (default: nenhum → comportamento atual de top N).
- **`distinct_field`**: campo para `count_distinct` (ex.: `numero_oc`).
- **`sum_field`**: campo para `sum`/`avg` (ex.: `valor_liquido`).
- **`scope`**: `'page' | 'global'` (default: `global`). Se `page`, herda os filtros da `pageContext.filters`. Se `global`, ignora filtros da página e usa apenas os filtros explicitados pela IA.

Quando `aggregate` está presente:
- Cliente faz a paginação completa (até teto de 50 páginas × 200 = 10k linhas) ou, melhor, chama o endpoint com `tamanho_pagina=1` e lê `total_registros` do envelope para `count`.
- Para `count_distinct`, busca campo `distinct_field` em todas as páginas (limita a 5 páginas para segurança) e conta valores únicos.
- Retorna `{ aggregate: 'count_distinct', field: 'numero_oc', value: 187, total_lines_scanned: 1240 }`.

#### 2) Ajustar `MODULE_MAP` com `aggregate_hints`

Cada módulo ganha `aggregateHints` declarando como contar a "unidade de negócio":

```ts
'painel-compras': {
  ...,
  countUnit: { field: 'numero_oc', label: 'OCs' },
  // "quantas OCs em aberto?" → aggregate:'count_distinct', distinct_field:'numero_oc', filters:{somente_pendentes:true}
},
'contas-pagar': { countUnit: { field: 'numero_titulo', label: 'títulos' } },
'estoque': { countUnit: { field: 'codpro', label: 'produtos' } },
// etc.
```

E o catálogo no system prompt passa a incluir essa info:
```
- painel-compras: ... | unidade de contagem: numero_oc (OCs)
```

#### 3) Atualizar regras do system prompt

Adicionar regras explícitas sobre **escopo** e **contagem**:

> **Escopo das perguntas analíticas**:
> - Se a pergunta usar palavras como "no total", "no geral", "em todo o ERP", "sem filtro" → `scope:'global'` (ignore o CONTEXTO DA PÁGINA).
> - Se a pergunta começar com "nesta tela", "nos resultados atuais", "no que está filtrado" → use o CONTEXTO DA PÁGINA.
> - **Ambíguo (caso padrão para "quantos/quantas X?")**: assume `scope:'global'` e mencione na resposta os filtros aplicados ("Considerando todas as OCs em aberto do ERP, temos 187 OCs").
>
> **Contagens**:
> - "quantos X?" / "quantas Y?" → use `query_erp_data` com `aggregate:'count_distinct'` e `distinct_field` da `countUnit` do módulo (ver catálogo).
> - NUNCA estime contagens a partir de `top_n`. Sempre use `aggregate`.
> - "qual o total/soma de X?" → `aggregate:'sum'`, `sum_field`.

Também relaxar a regra de "use o contexto da página": só vale quando o usuário menciona claramente "nesta tela" ou os KPIs visíveis já contêm a resposta exata.

#### 4) Aproveitar `total_registros` do backend (otimização)

Para `aggregate:'count'` simples, basta fazer 1 request `tamanho_pagina=1` e ler `resp.total_registros`. Sem percorrer páginas. Implementar como fast path em `executeQueryErpData`.

Para `count_distinct`, percorrer até 5 páginas de 200 (1000 registros) e devolver com flag `partial: true` se `total_registros > 1000`, para a IA poder dizer "ao menos 187 OCs distintas (amostra)".

#### 5) Testes manuais

1. `/painel-compras` filtrado por OC 40701 → "quantas OCs em aberto?" → IA chama `aggregate:'count_distinct', distinct_field:'numero_oc', filters:{somente_pendentes:true}, scope:'global'` → resposta: "Há **187 OCs em aberto** no ERP (1.240 itens). Quer abrir a tela com esse filtro?".
2. Mesma tela → "quantas OCs nessa tela?" → usa contexto da página (13 linhas / N OCs distintas se houver no contexto).
3. `/contas-pagar` → "quantos títulos vencidos?" → `count_distinct` por `numero_titulo` com filtro `data_vencimento_fim<hoje, somente_em_aberto:true`.
4. `/estoque` → "quantos produtos com saldo > 0?" → `count_distinct` `codpro` + `client_filters:{saldo:{gt:0}}`.
5. `/painel-compras` → "qual o valor total das OCs em aberto?" → `aggregate:'sum', sum_field:'valor_liquido', filters:{somente_pendentes:true}` → "R$ 4.820.150,00".
6. Sem permissão → erro educado mantido.

### Arquivos alterados

- **`src/lib/aiQueryExecutor.ts`**:
  - Adicionar `aggregate`, `distinct_field`, `sum_field`, `scope` em `QueryErpArgs`.
  - Adicionar `countUnit` em cada `ModuleConfig`.
  - Implementar `executeAggregate()` (count via `total_registros`, count_distinct/sum/avg paginando até 5×200).
  - Atualizar `buildModulesCatalog()` para incluir `unidade de contagem`.

- **`supabase/functions/ai-assistant/index.ts`**:
  - Adicionar parâmetros `aggregate`, `distinct_field`, `sum_field`, `scope` na tool `query_erp_data`.
  - Atualizar `BASE_SYSTEM_PROMPT` com as regras de escopo/contagem.
  - Tornar a regra "use contexto da página" mais restrita (apenas quando o usuário diz "nesta tela" ou os KPIs já trazem a resposta).

- **`src/components/erp/AiAssistantChat.tsx`**:
  - Repassar os novos campos para `executeQueryErpData`.
  - Quando `result.scope === 'global'`, exibir badge "Resultado global (ignora filtros da tela)".

### Fora de escopo

- Cross-módulo agregado.
- GROUP BY (top fornecedor por OC count) — usa o `top_n` existente.
- Filtros de data relativos ("últimos 30 dias") — futuro.

### Resultado

Pergunta **"quantas ordens de compra temos em aberto?"** passa a responder:

> 📊 No ERP existem **187 ordens de compra em aberto** (somando 1.240 itens).
>
> *Considerei o filtro padrão `somente_pendentes=true` em todo o ERP, ignorando os filtros desta tela.*
>
> Quer que eu abra o Painel de Compras com esse filtro? *(botão)*

E perguntas de soma, contagem, e por escopo (página vs global) passam a funcionar de forma consistente em todos os 20 módulos.

