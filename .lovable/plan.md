
## Cadastrar a rota nas permissões para a tela aparecer

### Causa
A tela está corretamente criada (`AuditoriaApontamentoGeniusPage.tsx`), com rota em `App.tsx` e item em `AppSidebar.tsx`. O que esconde o item é o controle de permissões: o hook `useUserPermissions` filtra o menu por `canView(path)` consultando `profile_screens`. Confirmei via banco: existem **22 rotas cadastradas** lá, e `/auditoria-apontamento-genius` **não é uma delas**. Resultado: para todo perfil que já tem permissões configuradas, o item fica oculto e o `ProtectedRoute` redireciona para `/estoque` se acessado via URL.

### Correção (migração única)
Inserir a tela em `profile_screens` para **todos os perfis existentes**, com `can_view = true` e `can_edit = false` por padrão. Cada admin pode depois ajustar acesso por perfil em **Configurações → Perfis de Acesso**.

```sql
INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT id, '/auditoria-apontamento-genius', 'Auditoria Apont. Genius', true, false
FROM public.access_profiles
ON CONFLICT (profile_id, screen_path) DO NOTHING;
```

(Se a constraint única não existir com esse nome, a migração faz `NOT EXISTS` no lugar de `ON CONFLICT` — ajusto na hora de aplicar.)

### Resultado esperado
- Item **"Auditoria Apont. Genius"** aparece imediatamente no menu lateral após reload.
- Acesso direto via `/auditoria-apontamento-genius` deixa de redirecionar.
- Admins podem desligar a visibilidade por perfil em Configurações se quiserem.

### Fora de escopo
- Sem alterações em código frontend (rota, página e sidebar já estão corretos).
- Sem mudança no `useUserPermissions` ou `ProtectedRoute`.
