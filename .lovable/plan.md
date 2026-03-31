

# Filtrar menus do sidebar com base nas permissões do usuário

## Problema
O sidebar só filtra o menu "Configurações" com base nas permissões. Todos os outros menus são exibidos para qualquer usuário, ignorando as permissões definidas no perfil (ex: `Usuarios_Fabrica_Genius` só tem Estoque e Onde Usa, mas vê tudo).

## Solução

### Alterar `src/components/AppSidebar.tsx`

Atualizar o filtro `visibleModules` para verificar `canView` em **todos** os módulos, não apenas em Configurações:

```ts
const visibleModules = modules.filter((m) => {
  if (loading) return false;          // esconde tudo enquanto carrega
  if (!hasPermissions) return true;   // sem perfil = mostra tudo (fallback)
  return canView(m.url);              // filtra por permissão
});
```

- Enquanto `loading`, nenhum menu aparece (evita flash de menus indevidos)
- Se o usuário não tem nenhuma permissão configurada (`!hasPermissions`), mostra tudo como fallback
- Se tem permissões, mostra apenas os módulos com `can_view = true`

### Alterar rotas em `src/App.tsx`

Adicionar proteção nas rotas individuais para que, mesmo acessando via URL, o usuário sem permissão seja redirecionado. Criar um componente `ProtectedRoute` genérico que verifica `canView(path)`.

