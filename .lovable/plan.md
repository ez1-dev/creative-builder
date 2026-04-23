
## Corrigir o entendimento do Assistente IA para perguntas globais e confirmações curtas

### Problema
Mesmo após a melhoria anterior, o assistente ainda está errando em dois cenários críticos:

1. **Perguntas globais** como:
   - “quantas ordens de compra temos em aberto?”
   - “qual o fornecedor com maior atraso?”
   
   Ele continua priorizando o **contexto filtrado da tela atual** (ex.: OC 40701) em vez de consultar o ERP inteiro.

2. **Confirmações curtas** como:
   - “sim”
   
   Depois de oferecer uma “busca global”, o assistente não reutiliza corretamente a intenção pendente e acaba respondendo de forma genérica ou repetindo o contexto local.

### Causas raiz
1. **A lógica atual ainda depende demais do modelo obedecer o prompt**.  
   As regras de `scope:"global"` existem, mas não há uma camada determinística que force `query_erp_data` quando a intenção é claramente analítica/global.

2. **O fluxo de continuação com “sim” não resolve a intenção anterior**.  
   O histórico é enviado ao modelo, mas não existe um resolvedor explícito para transformar “sim” em “faça a busca global que você acabou de propor”.

3. **O catálogo/campos do módulo `painel-compras` não está alinhado com o payload real**.  
   No código do módulo, o dado de fornecedor aparece como `fantasia_fornecedor`, mas o catálogo/configuração da IA usa `fornecedor`. Isso atrapalha respostas como “qual o fornecedor com maior atraso?”.

### Solução

#### 1) Adicionar um resolvedor determinístico de intenção antes do modelo
No `supabase/functions/ai-assistant/index.ts`, criar uma etapa anterior à chamada do gateway de IA para analisar a última mensagem do usuário e decidir se ela é um caso de:

- **pergunta analítica global**
- **drill-down da tela atual**
- **confirmação curta de uma ação pendente** (“sim”, “pode”, “quero”, “faça”)

Essa etapa gera uma intenção normalizada, por exemplo:

- `intent = global_count_open_purchase_orders`
- `intent = global_top_supplier_by_delay`
- `intent = confirm_previous_global_query`

#### 2) Forçar `query_erp_data` nos casos analíticos de alta confiança
Quando a intenção normalizada for analítica e clara, a edge function deve **forçar o uso da tool `query_erp_data`**, em vez de deixar o modelo decidir livremente entre responder com texto ou usar o contexto da página.

Casos a cobrir imediatamente:
- “quantas ordens de compra temos em aberto?”
  - `module: "painel-compras"`
  - `scope: "global"`
  - `aggregate: "count_distinct"`
  - `distinct_field: "numero_oc"`
  - `filters: { somente_pendentes: true }`

- “qual o fornecedor com maior atraso?”
  - `module: "painel-compras"`
  - `scope: "global"`
  - `filters: { somente_pendentes: true }`
  - `client_filters: { dias_atraso: { gt: 0 } }`
  - `order_by: "dias_atraso"`
  - `fields: ["fantasia_fornecedor", "numero_oc", "descricao_item", "dias_atraso", "data_entrega"]`
  - `top_n: 10`

#### 3) Resolver confirmações curtas (“sim”) com base na última oferta do assistente
Na mesma edge function, adicionar um resolvedor de follow-up:

- Se a última mensagem do usuário for apenas uma confirmação curta
- E a última resposta do assistente tiver oferecido algo como:
  - “posso fazer uma busca global”
  - “posso consultar no ERP inteiro”
  - “deseja remover os filtros da tela?”
  
Então a mensagem efetiva enviada ao modelo passa a ser a ação pendente explícita, por exemplo:
- “Faça a busca global de ordens de compra em aberto”
- “Consulte globalmente o fornecedor com maior atraso em OCs pendentes”

Isso evita que um simples “sim” perca o contexto.

#### 4) Corrigir o mapeamento de campos do `painel-compras`
No `src/lib/aiQueryExecutor.ts`, alinhar o módulo `painel-compras` com o payload real da API:

- usar `fantasia_fornecedor` como campo de fornecedor exibido
- revisar campos padrão usados nas respostas analíticas
- revisar campos numéricos reais (`valor_liquido` vs `valor_liquido_total`, se aplicável)
- manter filtros nativos do backend como estão, mas separar claramente:
  - **nome do filtro enviado**
  - **nome do campo retornado**

#### 5) Adicionar aliases de campos para a IA
Ainda em `src/lib/aiQueryExecutor.ts`, criar uma camada de aliases por módulo para que a IA possa pedir nomes mais naturais e o executor normalize para o campo real.

Exemplo no `painel-compras`:
- `fornecedor` → `fantasia_fornecedor`
- `valor_liquido_total` → campo real retornado na linha, se diferente
- outros aliases relevantes de negócio

Isso reduz falhas quando o modelo usar o nome “humano” e o dataset tiver outro nome técnico.

#### 6) Reforçar o prompt com exemplos de follow-up e ranking global
No `supabase/functions/ai-assistant/index.ts`, complementar o prompt com exemplos explícitos:

- “quantas ordens de compra temos em aberto?” → global
- “qual o fornecedor com maior atraso?” → global
- “sim” após oferta de busca global → executar a busca global pendente, não responder com contexto da tela

### Arquivos a alterar
- `supabase/functions/ai-assistant/index.ts`
  - resolvedor de intenção
  - resolvedor de confirmação curta
  - forcing de `query_erp_data` em casos analíticos claros
  - exemplos adicionais no prompt

- `src/lib/aiQueryExecutor.ts`
  - alinhar `painel-compras` ao payload real
  - adicionar aliases de campos
  - garantir que ordenação/campos retornados usem nomes corretos

### Testes manuais
1. Em `/painel-compras` com OC 40701 filtrada:
   - “quantas ordens de compra temos em aberto?”
   - esperado: resposta global, ignorando a OC da tela

2. Na mesma tela:
   - “qual o fornecedor com maior atraso?”
   - esperado: trazer fornecedor real do ERP global, não “verificar no detalhamento da OC 40701”

3. Fluxo em duas etapas:
   - IA: “posso fazer a consulta global, deseja?”
   - usuário: “sim”
   - esperado: executar a consulta global pendente corretamente

4. Pergunta explicitamente local:
   - “quantas OCs nesta tela?”
   - esperado: aí sim usar o contexto local/filtrado

### Resultado esperado
O assistente deixa de “achar que tudo é sobre a tela atual” e passa a:
- interpretar perguntas analíticas como **globais por padrão**
- usar `query_erp_data` de forma obrigatória nos casos claros
- entender confirmações curtas como continuação da intenção anterior
- responder corretamente perguntas como:
  - “quantas ordens de compra temos em aberto?”
  - “qual o fornecedor com maior atraso?”
