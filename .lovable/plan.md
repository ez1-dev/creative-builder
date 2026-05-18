## Problema

O módulo **Manutenção de Máquinas** (rota `/manutencao-maquinas`) não aparece em **Configurações → Permissões por Tela** porque está faltando na constante `AVAILABLE_SCREENS` de `src/pages/ConfiguracoesPage.tsx` (linhas 40-56). A rota existe (`ManutencaoMaquinasPage`) e já é tratada em `screenCatalog.ts` e no `useUserPermissions`, só não está exposta no editor de perfis.

## Mudança

Arquivo: `src/pages/ConfiguracoesPage.tsx`

Adicionar uma entrada logo após a linha de Manutenção de Frota:

```ts
{ path: '/frota', name: 'Manutenção de Frota' },
{ path: '/manutencao-maquinas', name: 'Manutenção de Máquinas' },
```

Nenhuma outra alteração necessária — após o deploy, basta marcar a permissão (visualizar/editar) para cada perfil que deve acessar o módulo.

## Fora de escopo

- Nenhuma alteração em backend, banco ou em outras telas.
- Permissões existentes não são afetadas; a tela continuará liberada para Administradores automaticamente.
