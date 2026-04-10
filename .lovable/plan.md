

# Fix: Contas a Pagar e Receber no menu e permissões

## Problema
As rotas `/contas-pagar` e `/contas-receber` já existem no sidebar (`AppSidebar.tsx`) e no router (`App.tsx`), mas:
1. **Não aparecem no menu** porque o usuário tem um perfil de acesso com permissões configuradas (`hasPermissions = true`), e essas rotas não existem na tabela `profile_screens` — logo `canView()` retorna `false` e o sidebar as oculta.
2. **Não aparecem na tela de Permissões** porque o array `ALL_SCREENS` em `ConfiguracoesPage.tsx` não inclui essas duas rotas.

## Solução

### 1. Adicionar ao `ALL_SCREENS` em `ConfiguracoesPage.tsx`
Inserir antes de `{ path: '/configuracoes', ... }`:
```typescript
{ path: '/contas-pagar', name: 'Contas a Pagar' },
{ path: '/contas-receber', name: 'Contas a Receber' },
```

### 2. Inserir registros na tabela `profile_screens`
Criar uma migração SQL que adicione as duas telas a **todos os perfis existentes** com `can_view = true` e `can_edit = false` (para que apareçam imediatamente no menu):

```sql
INSERT INTO profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT p.id, s.screen_path, s.screen_name, true, false
FROM access_profiles p
CROSS JOIN (VALUES 
  ('/contas-pagar', 'Contas a Pagar'),
  ('/contas-receber', 'Contas a Receber')
) AS s(screen_path, screen_name)
WHERE NOT EXISTS (
  SELECT 1 FROM profile_screens ps 
  WHERE ps.profile_id = p.id AND ps.screen_path = s.screen_path
);
```

Isso resolve ambos os problemas: as telas passam a ser gerenciáveis em Configurações e visíveis no menu para perfis existentes.

