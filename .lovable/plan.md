

## Permitir que o Assistente IA responda sobre usuários do sistema

### Problema
Pergunta "quais os usuários que têm acesso ao sistema" caiu em rota sem contexto (ou em rota cujo `pageContext` não tem dados de usuários). A IA não tem acesso às tabelas `profiles`, `user_access`, `access_profiles` e respondeu genericamente apontando para o ERP — o que é incorreto, pois esses dados estão no Lovable Cloud.

### Causa raiz
1. A edge function `ai-assistant` só conhece os 5 módulos operacionais (estoque, compras, etc.) via tool `apply_erp_filters`.
2. Não existe tool para consultar **dados administrativos** (usuários cadastrados, perfis, permissões).
3. O `pageContext` só carrega o que a página atual fornece — `/configuracoes` aba "Usuários" não está registrando lista de usuários no contexto.

### Solução proposta

**1. Nova tool `list_system_users` na edge function**
- Aceita filtros opcionais: `approved` (true/false), `profile_name` (Administrador, etc.), `search` (nome/email).
- Edge function executa query no Supabase com **service role** unindo `profiles` + `user_access` + `access_profiles`.
- Retorna lista resumida: `display_name`, `email`, `erp_user`, `approved`, `profile_name`, `last_seen_at` (de `user_sessions`).
- **Restrição de segurança**: tool só pode ser executada se o usuário chamador for **admin** (validado via `is_admin(auth.uid())` na edge function antes de rodar a query).

**2. Atualizar o system prompt**
- Adicionar bloco descrevendo a nova capacidade:
  > "Para perguntas sobre usuários cadastrados, perfis de acesso, quem é admin, quem está pendente de aprovação ou quem tem acesso a determinada tela, use a tool `list_system_users`. Apenas administradores podem usar esta tool — se o usuário não for admin, responda que essa informação é restrita."
- Reforçar: NUNCA mandar o usuário "consultar no ERP Senior" para dados que estão no Lovable Cloud.

**3. Validação de admin na edge function**
- Ler o JWT do header `Authorization`.
- Chamar `supabase.rpc('is_admin', { _uid: user.id })`.
- Se não for admin e a tool `list_system_users` for invocada → retornar erro tratado: "Acesso restrito a administradores."

**4. Registrar contexto na aba "Usuários" de Configurações (bonus)**
- Quando admin estiver em `/configuracoes` aba Usuários, registrar via `useAiPageContext`:
  - `summary`: "X usuários cadastrados (Y aprovados, Z pendentes)"
  - `kpis`: { 'Total': X, 'Aprovados': Y, 'Pendentes': Z, 'Admins': N }
- Permite respostas instantâneas sem precisar chamar a tool.

### Detalhes técnicos

**Tool definition (edge function):**
```ts
{
  type: "function",
  function: {
    name: "list_system_users",
    description: "Lista usuários cadastrados no sistema (Lovable Cloud). Apenas admins podem usar.",
    parameters: {
      type: "object",
      properties: {
        approved: { type: "boolean", description: "true=aprovados, false=pendentes, omitir=todos" },
        profile_name: { type: "string", description: "Filtrar por perfil (ex: Administrador)" },
        search: { type: "string", description: "Buscar por nome/email/erp_user" },
        limit: { type: "number", description: "Máximo de registros (default 50)" }
      }
    }
  }
}
```

**Query usada:**
```sql
SELECT p.display_name, p.email, p.erp_user, p.approved,
       ap.name AS profile_name, s.last_seen_at
FROM profiles p
LEFT JOIN user_access ua ON UPPER(ua.user_login) = UPPER(p.erp_user)
LEFT JOIN access_profiles ap ON ap.id = ua.profile_id
LEFT JOIN user_sessions s ON s.user_id = p.id
WHERE (filters...)
ORDER BY p.display_name
LIMIT :limit;
```

**Fluxo de resposta:**
1. Usuário (admin) pergunta "quem tem acesso?"
2. IA chama `list_system_users` com filtros opcionais.
3. Edge function valida admin → executa query → devolve JSON.
4. IA formata em **tabela markdown** no chat.

### Arquivos alterados
- `supabase/functions/ai-assistant/index.ts` — nova tool, validação de admin, query.
- `src/components/erp/AiAssistantChat.tsx` — tratar tool result `list_system_users` (renderizar tabela retornada pela IA, não navegar).
- `src/pages/ConfiguracoesPage.tsx` — registrar `useAiPageContext` com KPIs de usuários quando aba "Usuários" estiver ativa.

### Fora de escopo
- Editar/aprovar usuários via IA (apenas leitura).
- Auditoria de quem acessou o quê (já existe no Dashboard de Uso).
- Tools para `error_logs` ou `app_settings` (futuro pacote).

### Resultado
Admin pode perguntar:
- "Quem tem acesso ao sistema?" → tabela com todos os usuários.
- "Quais usuários estão pendentes de aprovação?" → lista filtrada.
- "Quem são os administradores?" → lista de admins.
- "O usuário João está aprovado?" → busca específica.

Usuário comum recebe resposta clara: "Essa consulta é restrita a administradores."

