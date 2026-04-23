

## Permitir que o Assistente IA responda perguntas analíticas sobre dados do ERP

### Problema
Quando o usuário pergunta **"qual produto tem mais em estoque hoje?"** (ou "top 5 fornecedores", "qual OC mais antiga em aberto", "produto mais comprado no mês"), o assistente diz "vou consultar..." mas **não tem como consultar de fato**. Ele só sabe:
- Navegar e aplicar filtros (`apply_erp_filters`) — exige o usuário olhar a tela.
- Ler `pageContext` — só funciona se o usuário já está na tela e fez busca.
- Listar usuários do Cloud (`list_system_users`).

Resultado: respostas vagas ou genéricas para perguntas analíticas reais.

### Causa raiz
O ERP Senior é consultado via API local (FastAPI/ngrok) com **token por usuário no navegador**. A edge function não tem esse token, então não pode chamar a API direto. A solução é **executar a consulta no cliente** e devolver o resultado para a IA processar.

### Solução: Tool client-side `query_erp_data` com loop de raciocínio

#### 1) Nova tool `query_erp_data` (declarada na edge function, executada no browser)
A IA pede ao cliente para buscar dados, ordenar por um campo e devolver o top N. O cliente roda a chamada real ao ERP, e devolve o resultado para a IA formatar a resposta final.

**Definição da tool:**
```ts
{
  name: "query_erp_data",
  description: "Consulta dados reais do ERP (estoque, compras, NFs, etc.) e retorna top N ordenado. Use para perguntas analíticas como 'qual produto tem mais estoque?', 'top 5 fornecedores', 'OCs mais antigas'.",
  parameters: {
    module: enum [estoque, painel-compras, compras-produto, contas-pagar, contas-receber, notas-recebimento, engenharia-producao],
    filters: object,           // mesmos filtros do módulo
    order_by: string,          // campo para ordenar (ex: 'saldo', 'valor_total', 'data_emissao')
    order_dir: 'asc' | 'desc', // default desc
    top_n: number,             // default 10, máx 50
    fields: string[]           // campos a devolver (reduz payload)
  }
}
```

#### 2) Fluxo de execução (multi-turn no cliente)
```text
1. Usuário: "qual produto tem mais estoque hoje?"
2. IA → tool_call: query_erp_data { module: 'estoque', filters: { somente_com_estoque: true, situacao: 'A' }, order_by: 'saldo', order_dir: 'desc', top_n: 10, fields: ['codigo','descricao','saldo','deposito'] }
3. Cliente executa: api.get('/api/estoque', { ...filters, pagina: 1, tamanho_pagina: 200 })
4. Cliente ordena por 'saldo' desc, pega top 10, projeta fields.
5. Cliente reenvia conversa para edge function com tool_result anexo.
6. IA formata resposta em markdown (tabela com top produtos).
```

O `AiAssistantChat.tsx` já tem `handleToolCall`. Precisa estender para suportar **tool client-side com retorno** (hoje só dispara navegação) — adicionar:
- Quando recebe `query_erp_data`, executa a chamada à API.
- Mostra "🔎 Consultando estoque..." como mensagem temporária.
- Faz POST de continuação para a edge function com `tool_results: [{ name, args, result }]`.
- Renderiza a resposta final da IA com o ranking.

#### 3) Edge function: aceitar `tool_results` no body
Quando o body inclui `tool_results`, a edge function:
- Anexa as mensagens `tool` (com o JSON do resultado) à conversa.
- Faz nova chamada ao Lovable AI Gateway (sem tools desta vez, ou com tools opcionais).
- Faz stream da resposta de texto final.

#### 4) Limites de segurança e custo
- **Tamanho do payload ERP**: cliente busca no máximo 200 registros (1 página) — suficiente para ranking. Se precisar mais, IA usa filtros adicionais.
- **Campos enviados de volta para a IA**: apenas os listados em `fields` (default: top 5 colunas + valor ordenado). Limita custo de tokens.
- **Permissão de rota**: cliente valida via `useUserPermissions` se o usuário tem acesso ao módulo antes de executar (evita IA "consultar" tela proibida).
- **Erros do ERP**: se 401/timeout, devolve `{ error: "..." }` para a IA, que responde "não consegui consultar agora".

#### 5) System prompt atualizado
Acrescentar:
> "Para perguntas analíticas que exigem **dados reais do ERP** (rankings, totais agregados, top N, ordenação por saldo/valor/data), use a tool `query_erp_data`. Sempre inclua `order_by` e `top_n`. Após receber o resultado, formate em **tabela markdown** com no máximo 10 linhas e ofereça aplicar filtros via `apply_erp_filters` para drill-down. Se o `pageContext` já trouxer a resposta nos KPIs, prefira usar o contexto sem chamar a tool."

### Módulos suportados na primeira versão
Mapeamento `module → endpoint API`:
| Módulo | Endpoint | Campo padrão de ordenação |
|---|---|---|
| estoque | `/api/estoque` | saldo |
| painel-compras | `/api/painel-compras` | valor_total |
| compras-produto | `/api/compras-produto` | quantidade |
| contas-pagar | `/api/contas-pagar` | valor_aberto |
| contas-receber | `/api/contas-receber` | valor_aberto |
| notas-recebimento | `/api/notas-recebimento` | valor_total |
| engenharia-producao | `/api/engenharia-producao` | data_entrega |

### Arquivos alterados
- `supabase/functions/ai-assistant/index.ts`
  - Declarar tool `query_erp_data`.
  - Aceitar `tool_results` no body e fazer segundo passo (sem ferramentas) com stream da resposta final.
  - Atualizar system prompt.
- `src/components/erp/AiAssistantChat.tsx`
  - Estender `handleToolCall` para tools client-side com retorno.
  - Adicionar `executeQueryErpData(args)` que chama `api.get(endpoint, filters)`, ordena e projeta.
  - Após executar, fazer 2ª request à edge function com `tool_results` e fazer streaming da resposta final.
  - Mostrar indicador "🔎 Consultando ERP..." enquanto busca.
- `src/lib/aiQueryExecutor.ts` *(novo)*
  - Mapeamento `module → endpoint + campo padrão`.
  - Função pura `rankRecords(records, order_by, dir, top_n, fields)`.
  - Sanitização de filtros e validação.

### Casos de teste manuais
1. `/estoque` vazio → "qual produto tem mais estoque?" → IA chama `query_erp_data` → tabela top 10.
2. Em qualquer rota → "top 5 fornecedores em ordens de compra abertas" → IA chama com `module=painel-compras, filters={somente_pendentes:true}, order_by=valor_total`.
3. `/contas-pagar` com filtros aplicados → "qual o maior título?" → IA usa `pageContext` (sem chamar tool).
4. Usuário sem permissão em compras-produto → IA recebe erro do cliente → responde "sem acesso a esse módulo".
5. ERP 401 → IA responde "conexão ERP indisponível, verifique nas Configurações".

### Fora de escopo
- Agregações server-side (sum/avg) que exijam novos endpoints do backend ERP.
- Cache de respostas (cada pergunta refaz a consulta).
- Gráficos gerados pela IA (apenas tabelas markdown).
- Cross-módulo ("compare estoque vs OCs em aberto") — futuro: tool sequencial.

### Resultado
Pergunta **"qual produto tem mais em estoque hoje?"** passa a responder com:
> Os 10 produtos com maior saldo em estoque são:
> | Código | Descrição | Saldo | Depósito |
> |---|---|---|---|
> | 12345 | Chapa Aço 3mm | 4.820,00 | DEP01 |
> | ... |
> Quer abrir a tela de estoque com esses filtros? *(botão chama `apply_erp_filters`)*

Funciona em **qualquer rota**, respeitando permissões e sem expor dados de outros usuários.

