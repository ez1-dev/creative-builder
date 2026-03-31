

# Adicionar campo "Usuário ERP" na aba Aprovações e gestão de usuários aprovados

## Problema
Ao aprovar um usuário, o sistema usa o email como `erp_user` automaticamente (linha 142: `user.email.toUpperCase()`), mas nem sempre o login ERP corresponde ao email. Não há como o admin configurar o `erp_user` correto — nem na aprovação, nem depois.

## Solução

### 1. Aba Aprovações — campo editável de Usuário ERP na aprovação
- Adicionar um campo `Input` "Usuário ERP" ao lado do seletor de Perfil de Acesso em cada linha de usuário pendente
- Pré-preencher com o email em maiúsculo (comportamento atual), mas permitir edição
- Usar o valor editado no `handleApproveUser` em vez de fixar `user.email.toUpperCase()`
- State: `pendingErpUserInputs: Record<string, string>` similar ao `pendingProfileSelections`

### 2. Aba Aprovações — seção de usuários já aprovados com edição de `erp_user`
- Abaixo da tabela de pendentes, adicionar uma segunda tabela "Usuários Aprovados" listando todos os profiles com `approved = true`
- Colunas: Email, Nome, Usuário ERP (editável via Input inline), botão Salvar
- Buscar todos aprovados (não apenas os com `erp_user` preenchido — alterar a query da linha 119)
- Permitir editar e salvar o `erp_user` de qualquer usuário aprovado

### Arquivos alterados
- `src/pages/ConfiguracoesPage.tsx` — toda a lógica e UI

