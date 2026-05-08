## Contexto
A tabela `user_access` já suporta múltiplos perfis por usuário (cada par `user_login + profile_id` é uma linha — foi assim que a Maiane ficou com **Compras** e **Passagens Aéreas - Acesso Total (Maiane)**). O hook `useUserPermissions` faz `OR` entre perfis. Então o backend já está pronto.

O que falta é UX clara em `Configurações → Usuários`: hoje a tabela mostra uma linha por vínculo, e o diálogo "Atribuir Perfil a Usuário" só atribui **um** perfil por vez.

## Objetivo
Tornar evidente que um usuário pode ter **vários perfis** simultaneamente, e tornar a atribuição múltipla rápida.

## Mudanças no `src/pages/ConfiguracoesPage.tsx`

### 1) Diálogo "Atribuir Perfil a Usuário" — multi-perfil
- Trocar o `<Select>` único de Perfil por uma lista de **checkboxes** (componente `Checkbox` do shadcn) com todos os perfis disponíveis.
- Filtrar opções já atribuídas ao usuário escolhido (continuam visíveis mas pré-marcadas e desabilitadas, com legenda "já atribuído").
- Botão "Atribuir": insere todos os perfis marcados em um `insert([...])` único.
- Mensagem de toast: "N perfis atribuídos".

### 2) Tabela "Atribuição de Usuários" — agrupada por usuário
- Reagrupar `userAccess` por `user_login` antes de renderizar.
- Colunas: **Usuário | Perfis (badges) | Última atribuição | Ações**.
- Cada perfil vira um `<Badge>` com botãozinho "x" que remove apenas aquele vínculo (`user_access.id`).
- Ação extra na linha: botão **"+ Adicionar perfil"** que abre o mesmo diálogo já com o usuário pré-selecionado e mostra apenas perfis ainda não vinculados.

### 3) Estado local
- Trocar `newUserProfileId: string` por `newUserProfileIds: string[]`.
- `handleAddUser`: validar `newUserLogin` e `newUserProfileIds.length > 0`; fazer um único `insert` com array.
- Manter `handleRemoveUser(id)` por vínculo individual (já existe).

### 4) Detalhes de UI
- Usar tokens semânticos (`text-muted-foreground`, `badge variant="secondary"`, `text-destructive`) — sem cores hardcoded.
- Lista de checkboxes em `max-h-64 overflow-auto` para listas grandes de perfis.
- Acessibilidade: cada checkbox com `<Label>` clicável.

## Validação
- Atribuir Maiane → marcar Compras + Passagens Aéreas Acesso Total numa só ação → tabela mostra os dois badges na mesma linha.
- Remover apenas um badge → o outro continua.
- Botão "+ Adicionar perfil" na linha de outro usuário abre diálogo já filtrado.
- `useUserPermissions` continua somando permissões.

## Fora do escopo
- Não mexer no schema do banco (já suporta o caso).
- Não mudar o fluxo de Aprovações nem de Telas/Visuais.