## Excluir todos os registros de Passagens Aéreas (apenas admin)

Adicionar um botão "Excluir todos" no header da página `/passagens-aereas`, visível apenas para administradores, com dupla confirmação antes de apagar todos os registros da tabela `passagens_aereas`.

### Mudanças

**1. `src/hooks/useUserPermissions.ts`**
- Expor flag `isAdmin` (já existe lógica de perfis; basta consultar `access_profiles.name = 'Administrador'` entre os perfis do usuário, ou reutilizar a função `is_admin` via RPC). Vou usar a abordagem simples: verificar se algum perfil retornado tem `name === 'Administrador'`, adicionando `name` ao select de `access_profiles`.

**2. `src/pages/PassagensAereasPage.tsx`**
- Importar `Trash2` de `lucide-react`.
- Ler `isAdmin` do hook.
- Adicionar estado `confirmDeleteAll` (boolean) e `deleteAllText` (texto digitado para confirmação).
- Renderizar botão `variant="destructive"` "Excluir todos" no `PageHeader.actions`, somente quando `isAdmin === true`.
- Ao clicar, abrir um `AlertDialog` exigindo que o usuário digite `EXCLUIR TODOS` para habilitar o botão de confirmação.
- Ao confirmar: `await supabase.from('passagens_aereas').delete().not('id', 'is', null)` (delete sem filtro exige cláusula; usar `.gte('data_registro', '1900-01-01')` ou similar). Mostrar toast de sucesso/erro e recarregar.

### Segurança
A RLS atual já restringe `DELETE` em `passagens_aereas` a admins (`is_admin(auth.uid())`), então um usuário não-admin que tentasse burlar a UI seria bloqueado pelo banco. O gating no frontend é apenas conveniência visual.

### Resumo visual do botão
Header da página passa a ter: Atualizar | Compartilhar | Importar planilha | Novo registro | **Excluir todos** (vermelho, só admin).
