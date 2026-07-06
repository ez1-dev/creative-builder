## Faltou expor RH-05 no menu lateral e no catálogo

A página, rota e index `/rh` já estão prontos, mas o item não aparece no menu lateral (que é o caminho normal de navegação) porque o `AppSidebar` e o `screenCatalog` não conhecem a rota.

## Alterações

### `src/components/AppSidebar.tsx` (linha 211, seção RH)
Adicionar item logo abaixo de "Férias":
```
{ title: 'Turnover', url: '/rh/turnover', icon: TrendingUp },
```
Importar `TrendingUp` de `lucide-react` se ainda não estiver importado nesse arquivo.

### `src/lib/screenCatalog.ts` (após linha 42)
Registrar a tela para logs de navegação e permissões:
```
'/rh/turnover': { codigo: 'RH_TURNOVER', nome: 'RH — Rotatividade / Turnover' },
```

## Observações
- Usuário atual é admin (`isAdmin: true`), então `ProtectedRoute` já libera acesso mesmo sem entrada em `profile_screens`. Para usuários não-admin, será preciso conceder permissão na tela Configurações.
- Nada muda na página `TurnoverPage`, rotas ou API — só exposição no menu e catálogo.
