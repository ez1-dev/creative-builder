## Diagnóstico

A tela **Monitor de Usuários Senior** (`/monitor-usuarios-senior`) hoje não aparece em **Configurações → Permissões por Tela** porque ela não está na constante `ALL_SCREENS` em `src/pages/ConfiguracoesPage.tsx` (linhas 25–51). Por isso não há linha pra marcar/desmarcar `can_view`/`can_edit` por perfil.

Já está no `ALL_SCREENS` o padrão correto: `{ path, name }`. O componente percorre `ALL_SCREENS.map(...)` na linha 607 para renderizar a matriz de permissões.

## Mudança

Em `src/pages/ConfiguracoesPage.tsx`, adicionar uma entrada nova logo antes de `/configuracoes`:

```ts
{ path: '/monitor-usuarios-senior', name: 'Monitor de Usuários Senior' },
```

Diff alvo (trecho):

```ts
const ALL_SCREENS = [
  // ... demais entradas ...
  { path: '/passagens-aereas', name: 'Passagens Aéreas' },
  { path: '/monitor-usuarios-senior', name: 'Monitor de Usuários Senior' }, // ← novo
  { path: '/configuracoes', name: 'Configurações' },
];
```

## O que NÃO muda

- Estrutura da tabela `profile_screens` no Cloud — já suporta qualquer `screen_path`/`screen_name`.
- Hook `useUserPermissions` — já lê dinamicamente o que estiver cadastrado em `profile_screens`.
- Rota `/monitor-usuarios-senior` (e o alias `/usuarios-conectados`) e a regra atual de quem pode **desconectar** (ADMIN ou RENATO) — continuam iguais. As permissões por tela controlam apenas quem **vê** a página.

## Validação

1. Entrar em **Configurações → Permissões por Tela**.
2. A linha **"Monitor de Usuários Senior"** aparece em cada perfil.
3. Marcar `Ver` para um perfil de teste → usuário daquele perfil consegue acessar `/monitor-usuarios-senior`.
4. Desmarcar `Ver` → usuário cai no bloqueio padrão do `ProtectedRoute`.
5. Botão **Desconectar** continua condicionado a ADMIN/RENATO, independente de `can_edit`.
