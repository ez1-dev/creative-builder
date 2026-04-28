## Problema

Ao criar um link de compartilhamento de Passagens Aéreas surge:

> Erro ao criar link — `new row violates row-level security policy for table "passagens_aereas_share_links"`

A tabela `passagens_aereas_share_links` tem uma única policy: `is_admin(auth.uid())` para ALL. Mesmo que o usuário seja admin, o `INSERT` direto está sendo bloqueado pela função `is_admin`, que depende do encadeamento `profiles.erp_user → user_access.user_login → access_profiles.name = 'Administrador'`.

Já existe a função `create_passagens_share_link` no banco (`SECURITY DEFINER`), criada justamente para esse fluxo. Ela:
- Valida `is_admin` internamente.
- Faz o hash bcrypt da senha (quando aplicável).
- Faz o `INSERT` com privilégios elevados, ignorando a policy.

O bug é que `ShareLinksDialog.tsx` faz `supabase.from('passagens_aereas_share_links').insert(...)` em vez de chamar a RPC.

## Correção

Trocar o `INSERT` direto pela chamada `supabase.rpc('create_passagens_share_link', { ... })` em `src/components/passagens/ShareLinksDialog.tsx` (função `handleCreate`):

- Parâmetros: `_token` (effectiveToken), `_nome`, `_password` (sentinela `'protected'` quando há senha — alinhado com `validate_share_token`, que aceita esse sentinela), `_expires_at`.
- Remover a chamada `supabase.auth.getUser()` (a função usa `auth.uid()` internamente para `created_by`).
- Tratamento de erro idêntico ao atual.

Sem mudanças de schema, sem migrações.

## Arquivos alterados

- `src/components/passagens/ShareLinksDialog.tsx` — substituir o `insert` direto pela RPC `create_passagens_share_link`.

## Resultado esperado

- Admin consegue criar links normalmente.
- Sentinela `'protected'` permanece no `password_hash` quando há senha, mantendo compatibilidade com a validação atual (token efetivo já carrega a senha embutida via SHA-256 no cliente).