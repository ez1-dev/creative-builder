Esconder o botão **Editar dashboard** no BI Comercial quando o usuário não tem permissão para editar.

## Arquivo

`src/pages/bi/ComercialPage.tsx` (linhas ~1194-1203)

Substituir o botão atual (que ficava apenas desabilitado com tooltip) por uma renderização condicional `{canEditDashboard && (...)}`:

- Remover `disabled={!canEditDashboard}`.
- Trocar o tooltip dinâmico por `title="Editar dashboard"` fixo.
- O resto permanece (handleEnterEdit, classes, ícone, label).

## Comportamento resultante

- **Admin** ou usuário com `can_edit` em `/bi/comercial`: vê o botão tanto em "Oficial" quanto em "Minha versão".
- **Demais usuários**: o botão fica oculto no modo Oficial. Para editar, ativam "Minha versão" (que cria um fork pessoal) — aí `layout.isPersonal` vira true e o botão aparece.

## Fora do escopo

- Toggle "Oficial / Minha versão" continua visível para todos.
- Nenhuma mudança em permissões, hooks ou backend.