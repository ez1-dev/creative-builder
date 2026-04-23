

## Corrigir filtro de "ver detalhes do título" do Assistente IA

### Problema
Fluxo:
1. Usuário: "qual o maior valor em aberto no Contas a Pagar?"
2. IA: "É o título **1669** com R$ 485.481,43. Quer ir para a tela?"
3. Usuário: "sim"
4. IA navega para `/contas-pagar` aplicando `numero_titulo: "1669"` → tela mostra **dezenas de títulos antigos pagos** (1669, 11669, 21669, 116691, 011669/01...) porque o backend faz **busca por substring**, não por igualdade.

Resultado: o usuário pediu "este título" e recebeu uma lista enorme de títulos não relacionados.

### Causas raiz

1. **Filtro `numero_titulo` é LIKE no backend**: passar "1669" casa qualquer string que contenha "1669". O ERP Senior usa chaves compostas (`tipo_titulo + numero_titulo + parcela + fornecedor`), então só `numero_titulo` nunca identifica um título único.

2. **Faltou `somente_saldo_aberto: true`**: o usuário pediu o "maior em aberto" → ao navegar, a IA precisa preservar esse filtro, senão aparecem os pagos.

3. **A IA não capturou as outras chaves do título** (tipo_titulo `RET`, fornecedor `1669` SECRETARIA RECEITA FEDERAL, parcela `4`, vencimento 20/04/2026) na resposta original — só citou "1669" como rótulo amigável.

4. **Catálogo do módulo não avisa a IA** de que `numero_titulo` é busca parcial e que para identificar 1 título único é preciso combinar com fornecedor + vencimento (ou usar valor mínimo/máximo + intervalo de vencimento como cerca).

### Solução

#### 1) Atualizar `MODULE_MAP['contas-pagar']` e `['contas-receber']` em `src/lib/aiQueryExecutor.ts`

Documentar no `description` e adicionar `defaultFields` mais ricos (incluir `tipo_titulo`, `nome_fornecedor`, `parcela`, `status_titulo`):

```ts
'contas-pagar': {
  ...,
  defaultFields: ['tipo_titulo', 'numero_titulo', 'parcela', 'nome_fornecedor', 
                  'valor_aberto', 'valor_original', 'data_vencimento', 'status_titulo'],
  description: 'Títulos a pagar. ATENÇÃO: numero_titulo é busca por SUBSTRING — não identifica título único. Para localizar 1 título específico, combine com fornecedor + intervalo estreito de data_vencimento + valor_min/valor_max.',
  availableFilters: [..., 'valor_min', 'valor_max', 'somente_saldo_aberto', 'somente_vencidos', 'tipo_titulo'],
  example: '"abrir o título de R$ 485.481 com vencimento 20/04/2026" → filters:{valor_min:485481, valor_max:485482, data_vencimento_ini:"2026-04-20", data_vencimento_fim:"2026-04-20", somente_saldo_aberto:true}',
},
```

(Mesma atualização para `contas-receber` com `nome_cliente`.)

#### 2) Reforçar regras no system prompt (`supabase/functions/ai-assistant/index.ts`)

Adicionar no `BASE_SYSTEM_PROMPT` regra específica para **navegação de drill-down**:

> **Drill-down ("ver detalhes deste título/OC/projeto")**:
> Quando a última resposta do assistente identificou **1 registro específico** e o usuário confirma com "sim", "abrir", "ver detalhes":
> - **NÃO** use apenas o "número" como filtro — vários sistemas (incl. Contas a Pagar) fazem busca por substring e retornarão dezenas de registros não relacionados.
> - Use uma **cerca de filtros** combinando todos os identificadores conhecidos do registro: data exata, valor exato (`valor_min` = `valor_max` = valor do registro), fornecedor/cliente, tipo do título, e sempre `somente_saldo_aberto:true` se o contexto era "em aberto".
> - Para Contas a Pagar/Receber, **sempre** inclua `somente_saldo_aberto:true` quando o registro de origem era "em aberto".

Também incluir exemplo:
```
USER: "qual o maior título em aberto?"  
ASSISTANT: "É R$ 485.481,43 vencendo 20/04/2026 (título 1669). Abrir?"  
USER: "sim"  
→ apply_erp_filters({ module:"contas-pagar", filters:{
    valor_min:485481.43, valor_max:485481.44,
    data_vencimento_ini:"2026-04-20", data_vencimento_fim:"2026-04-20",
    somente_saldo_aberto:true
  }})
```

#### 3) Resolvedor de confirmação curta — preservar resultado anterior

Em `supabase/functions/ai-assistant/index.ts`, no resolvedor de "sim" já existente, adicionar um **memorando estruturado**: quando uma resposta anterior do assistente apresenta 1 registro específico (extraível via regex de "R$ X com vencimento DD/MM/YYYY"), injetar no contexto da próxima mensagem do usuário um snippet:

> Contexto pendente: usuário acabou de confirmar abrir o registro `{valor: 485481.43, data_vencimento: "2026-04-20", numero_titulo: "1669"}` em `contas-pagar`. Use cerca de filtros valor_min/valor_max + data exata + somente_saldo_aberto:true.

Isso reduz a chance do modelo cair de novo em "só passa o número".

#### 4) Hardening client-side em `AiAssistantChat.handleToolCall`

Em `src/components/erp/AiAssistantChat.tsx`, quando o tool `apply_erp_filters` chega com `module` em `['contas-pagar','contas-receber']` e o `filters` contém apenas `numero_titulo` (sem valor_min/data) — **avisar via toast** "Filtro amplo aplicado — pode trazer títulos similares" e, opcionalmente, **forçar `somente_saldo_aberto:true`** se a conversa anterior mencionar "em aberto" (heurística simples no histórico local).

Nota: hardening client-side é só rede de segurança; o fix principal é o prompt + catálogo.

### Testes manuais

1. `/contas-pagar` → "qual o maior título em aberto?" → IA responde com valor + vencimento.
2. "sim, abrir" → tela navega filtrando por `valor_min=valor_max + data_vencimento_ini=data_vencimento_fim + somente_saldo_aberto:true` → **1 linha** correspondente ao título de R$ 485.481,43.
3. "qual o segundo maior?" → IA usa `aggregate` ou top_n=2 e oferece o seguinte.
4. "abrir título 1669" (digitado direto) → IA pergunta: "Existem vários títulos contendo '1669'. Você quer todos os títulos com substring '1669', ou um específico? (informe valor ou vencimento)"

### Arquivos alterados

- **`src/lib/aiQueryExecutor.ts`**: enriquecer `defaultFields`, `availableFilters`, `description` e `example` de `contas-pagar` e `contas-receber`.
- **`supabase/functions/ai-assistant/index.ts`**: nova regra de drill-down no `BASE_SYSTEM_PROMPT`; ampliar resolvedor de confirmação curta para extrair valor/data citados na última resposta e injetar como contexto.
- **`src/components/erp/AiAssistantChat.tsx`** (opcional, hardening): toast informativo e injeção de `somente_saldo_aberto:true` quando heurística confirmar contexto "em aberto".

### Fora de escopo
- Mudar comportamento LIKE do backend para igualdade exata em `numero_titulo`.
- Criar endpoint novo `/api/contas-pagar/{id}` para drill-down direto.

### Resultado
Quando o usuário confirma "sim, abrir este título", a tela mostra **exatamente o título identificado** (1 linha), preservando o estado "em aberto" da conversa, sem trazer dezenas de títulos antigos pagos com substring coincidente.

