## Problema

A aba **Configurações → Permissões por Tela** é renderizada a partir de uma constante estática `ALL_SCREENS` (linhas 25–50 de `src/pages/ConfiguracoesPage.tsx`). Essa lista contém Auditoria Apont. Genius, Contas a Pagar, Passagens Aéreas, etc., mas **não inclui `/faturamento-genius`**. Por isso, mesmo a rota existindo em `App.tsx` e no `AppSidebar`, o toggle de permissão não aparece.

## Correção

Adicionar a entrada da tela "Faturamento Genius" em `ALL_SCREENS`, posicionada logo após "Auditoria Apont. Genius" para manter o agrupamento lógico (mesmo bloco do menu lateral).

```ts
{ path: '/auditoria-apontamento-genius', name: 'Auditoria Apont. Genius' },
{ path: '/faturamento-genius', name: 'Faturamento Genius' }, // ← novo
{ path: '/conciliacao-edocs', name: 'Conciliação EDocs' },
```

## Arquivo afetado

- `src/pages/ConfiguracoesPage.tsx` — 1 linha adicionada na constante `ALL_SCREENS`.

## Pós-correção

Após o deploy, em **Configurações → Perfis de Acesso → Permissões por Tela**, o administrador poderá marcar `can_view` / `can_edit` para "Faturamento Genius" em cada perfil. Perfis existentes não terão a linha em `profile_screens` até o admin alternar o switch (comportamento idêntico ao de outras telas adicionadas posteriormente — o `togglePermission` já faz INSERT quando não existe).

Nenhuma migration de banco é necessária: a tabela `profile_screens` é populada sob demanda quando o admin edita a permissão.