

## Assistente IA com aprendizado e sugestões personalizadas por usuário

### Objetivo
Tornar o assistente **proativo e personalizado**: ele passa a memorizar as pesquisas e ações de cada usuário, aprende padrões (filtros frequentes, módulos mais usados, horários, combinações comuns) e oferece **sugestões inteligentes** para agilizar o trabalho do dia a dia.

### Diagnóstico atual
- O assistente hoje é "stateless": cada conversa começa do zero, sem memória de pesquisas anteriores.
- `user_activity` já registra `path`, `action` e `details` (filtros), mas **só é usado pelo Dashboard de Uso admin** — o próprio assistente não consulta esses dados.
- Não há tabela de "favoritos", "buscas salvas" ou "preferências por usuário".

### Solução em 3 camadas

---

#### 📦 Camada 1 — Histórico de buscas por usuário (memória curta, 30 dias)

**Nova tabela `user_search_history`:**
```sql
- id uuid pk
- user_id uuid (FK profiles)
- module text          -- 'estoque', 'painel-compras', etc.
- filters jsonb        -- { codigo: '001', situacao: 'A', ... }
- result_count int     -- quantos registros retornou
- created_at timestamptz
```

**Como popula:**
- Hook `useSearchTracking(module)` chamado em cada página de consulta após `Pesquisar`.
- Salva via `supabase.from('user_search_history').insert(...)` — leve, async, não bloqueia UI.
- Cleanup automático >30 dias (trigger pg_cron diário).

**RLS:** usuário só lê/insere o próprio histórico.

---

#### 📦 Camada 2 — Preferências aprendidas (memória longa)

**Nova tabela `user_preferences`:**
```sql
- user_id uuid pk
- favorite_modules jsonb    -- top 5 módulos com contagem
- frequent_filters jsonb    -- por módulo: filtros mais usados
- preferred_period text     -- 'mes_atual', 'ultimos_30d', etc.
- updated_at timestamptz
```

**Como popula:**
- Edge function `recompute-user-preferences` roda **diariamente via pg_cron** para cada usuário ativo.
- Agrega `user_search_history` + `user_activity` dos últimos 30 dias.
- Calcula: top módulos, filtros recorrentes (>3 vezes), padrões temporais.
- Custo: ~1 segundo por usuário ativo, fora do horário comercial.

---

#### 📦 Camada 3 — Assistente proativo

**3 novas capacidades no chat:**

**A) Sugestões ao abrir o chat (sem prompt do usuário)**
Quando o usuário abre o assistente em uma página, ele vê **chips clicáveis** com as 3 buscas mais frequentes naquele módulo:

```
💡 Sugestões para você:
  [Família 001 ativos]   [Estoque crítico - Setor A]   [OCs vencidas - mês atual]
```

Clicar = aplica os filtros direto (reusa `dispatchAiFilters`).

**B) Nova tool `recall_user_searches` na edge function**
O modelo pode buscar o histórico do próprio usuário:
- "O que pesquisei na semana passada?" → lista resumida
- "Repita minha última busca de estoque" → aplica filtros idênticos
- "Aquela consulta de OCs do projeto X" → busca por similaridade no histórico

**C) Contexto enriquecido no system prompt**
Junto com `pageContext`, a edge function passa:
```ts
userMemory: {
  topModules: ['estoque', 'contas-pagar'],
  frequentFilters: { estoque: { situacao: 'A', familia: '001' } },
  recentSearches: [últimas 5 do mesmo módulo]
}
```

A IA usa isso para responder coisas como:
> "Vi que você costuma filtrar família 001 com situação Ativo — quer aplicar esses filtros agora?"

---

### Privacidade e segurança
- **Cada usuário só vê seu próprio histórico/preferências** (RLS estrito por `auth.uid()`).
- Admin **NÃO** acessa histórico individual via assistente (apenas agregados no Dashboard de Uso).
- Botão **"Limpar meu histórico"** em Configurações → "Minha conta".
- Nenhum dado sensível (CPF, valores monetários individuais) é salvo — apenas filtros e nomes de módulos.

---

### Mudanças de UI

**No `AiAssistantChat.tsx`:**
- Quando `messages.length === 0`, renderizar bloco "Sugestões para você" com chips clicáveis (vindos de `user_preferences.frequent_filters[currentModule]`).
- Adicionar comando rápido `/historico` que lista últimas 10 buscas.

**Em `ConfiguracoesPage.tsx`:**
- Nova aba/seção "Minhas preferências" mostrando:
  - Módulos favoritos (top 5)
  - Filtros mais usados
  - Botão "Limpar histórico"

---

### Arquivos novos
- `src/hooks/useSearchTracking.ts` — registra busca após `Pesquisar`.
- `src/hooks/useUserSuggestions.ts` — busca sugestões da `user_preferences`.
- `src/components/erp/SearchSuggestions.tsx` — chips de sugestão no chat.
- `supabase/functions/recompute-user-preferences/index.ts` — job de agregação diário.

### Arquivos alterados
- `supabase/functions/ai-assistant/index.ts` — nova tool `recall_user_searches`, injeção de `userMemory` no system prompt.
- `src/components/erp/AiAssistantChat.tsx` — bloco de sugestões iniciais, comando `/historico`.
- Páginas de consulta (Estoque, Compras, etc.) — chamar `useSearchTracking(module)` após pesquisa bem-sucedida.
- `src/pages/ConfiguracoesPage.tsx` — seção "Minhas preferências".

### Migrations
- Criar `user_search_history` + RLS + cleanup function.
- Criar `user_preferences` + RLS.
- Agendar pg_cron diário às 03:00 para `recompute-user-preferences`.

---

### Fora de escopo (futuro)
- Recomendação preditiva ("usuários parecidos com você costumam buscar...") — exige modelo treinado.
- Importar/exportar buscas favoritas.
- Atalhos de teclado por busca salva.

### Resultado esperado
- Usuário abre o assistente em **/estoque** e já vê suas 3 buscas mais frequentes para clicar.
- Pergunta "qual filtro usei ontem em compras?" → assistente responde com filtros + botão para reaplicar.
- Após 1 semana de uso, assistente sugere proativamente: *"Você consulta família 001 com situação Ativo quase todo dia. Quer que eu salve como busca padrão?"*
- Tudo respeitando privacidade individual e sem expor dados de outros usuários.

