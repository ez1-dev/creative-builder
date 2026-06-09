# Restringir ações técnicas do BI Comercial a administradores

## Itens a esconder para usuários comuns

No header de `/bi/comercial`, esconder para quem **não** é admin (`isAdmin === false` via `useUserPermissions`):

1. Descrição **"Faturamento comercial validado (fonte_acao = VM_FATURAMENTO)."** do `PageHeader`.
2. Toggle **"Números: Completo / Sem decimais / Abreviado"** (`NumberRoundingToggle`).
3. Link **"Biblioteca BI"** (`/biblioteca-bi`).
4. Botão **"Atualizar"** (refresh manual).

Os três botões **"Sincronizar clientes / produtos / revendas"** já estão gated em `isAdmin` — sem mudança.

## Mudanças

**`src/pages/bi/ComercialPage.tsx`**
- Tornar a `description` do `PageHeader` condicional: `isAdmin ? "Faturamento comercial validado (fonte_acao = VM_FATURAMENTO)." : undefined`.
- Envolver `<NumberRoundingToggle />` em `{isAdmin && (...)}`.
- Envolver o `<Button asChild>` da Biblioteca BI em `{isAdmin && (...)}`.
- Envolver o botão "Atualizar" em `{isAdmin && (...)}`.

## Fora de escopo

- Permissões em outras telas BI.
- Mudança no modelo de roles ou em `useUserPermissions`.
- Esconder o toggle Oficial/Minha versão, "Editar dashboard" ou demais controles do header — continuam visíveis (já têm regras próprias).
