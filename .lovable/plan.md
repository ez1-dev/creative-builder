

## Cadastrar "Auditoria Apont. Genius" em Permissões por Tela

### Diagnóstico
Na tela `/configuracoes`, a constante `ALL_SCREENS` (linhas 20–42 de `src/pages/ConfiguracoesPage.tsx`) lista todas as telas que aparecem na matriz "Permissões por Tela" de cada perfil. A entrada **`/auditoria-apontamento-genius`** está faltando — por isso administradores não conseguem liberar/bloquear essa tela por perfil. Hoje, qualquer perfil com permissões configuradas acaba **sem acesso** a ela (a regra `canView` retorna `false` quando o path não está em `profile_screens`).

A rota já existe em `App.tsx`, está protegida por `ProtectedRoute` e aparece no `AppSidebar`, então só falta registrá-la na matriz.

### Mudança (arquivo único: `src/pages/ConfiguracoesPage.tsx`)

Adicionar uma linha em `ALL_SCREENS`, logo após "Auditoria Tributária" (linha 28), mantendo o agrupamento lógico:

```ts
{ path: '/auditoria-tributaria', name: 'Auditoria Tributária' },
{ path: '/auditoria-apontamento-genius', name: 'Auditoria Apont. Genius' },
{ path: '/conciliacao-edocs', name: 'Conciliação EDocs' },
```

### Pós-implementação (ação do administrador)
Depois do deploy, o admin precisa abrir **Configurações → Permissões por Tela**, para cada perfil que deva acessar a auditoria, marcar **Visualizar** (e **Editar**, se aplicável) na nova linha "Auditoria Apont. Genius". Sem isso, perfis existentes continuarão sem ver a tela.

### Detalhes técnicos
- Mudança puramente declarativa em uma constante.
- Sem migração de banco: a permissão é criada/atualizada sob demanda em `profile_screens` quando o admin marca os toggles (já existe a lógica `toggleScreen` nas linhas 340–358).
- `useUserPermissions` já lê dinamicamente o que estiver em `profile_screens`, então passa a respeitar a nova tela automaticamente.
- Sem mudança em rotas, sidebar, RLS ou qualquer outro arquivo.

### Fora de escopo
- Conceder a permissão automaticamente a perfis existentes (deve ser feito manualmente pelo admin, para preservar o controle).
- Reorganizar a ordem das demais telas.
- Adicionar agrupamento visual por categoria na matriz.

### Resultado
A linha "Auditoria Apont. Genius" passa a aparecer na matriz de Permissões por Tela de cada perfil em Configurações, permitindo liberar/bloquear o acesso da mesma forma que as demais telas.

