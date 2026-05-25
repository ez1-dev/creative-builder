## Restringir botão "Modo TV" a Administradores

### Mudança
Mostrar o botão `<TvModeButton />` apenas quando o usuário tiver perfil **Administrador** (flag `isAdmin` já existente em `useUserPermissions`).

### Implementação
1. **`src/components/TvModeButton.tsx`**
   - Importar `useUserPermissions`.
   - Se já estiver em `tvMode` (URL `?tv=1`), continuar renderizando o botão "Sair Modo TV" para qualquer usuário (assim quem abrir o link wallboard consegue voltar).
   - Caso contrário, retornar `null` quando `!isAdmin`.

2. **`src/components/erp/PageHeader.tsx`** — sem alterações (já delega ao `TvModeButton`).

### Fora de escopo
- Criar nova flag SuperAdmin (usuário escolheu "Qualquer Administrador").
- Bloquear acesso à URL `?tv=1` diretamente — qualquer usuário logado com link continua podendo abrir o mural; só ocultamos o botão da UI normal.
