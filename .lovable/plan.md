

# Aprovação de Novos Usuários pelo Administrador

## Objetivo
Novos usuários que se cadastram ficam com status "pendente" até que um administrador aprove o acesso. Enquanto não aprovados, não conseguem acessar o sistema.

## Alterações

### 1. Migração: adicionar coluna `approved` na tabela `profiles`
- Adicionar coluna `approved boolean NOT NULL DEFAULT false` à tabela `profiles`
- Atualizar perfis existentes para `approved = true` (para não bloquear quem já usa)

### 2. `src/contexts/AuthContext.tsx`
- Após login, consultar `profiles.approved` do usuário
- Expor um novo campo `approved` no contexto
- Se `approved = false`, o usuário fica autenticado mas bloqueado

### 3. `src/components/AppLayout.tsx`
- Verificar `approved` do contexto
- Se `approved === false`, exibir tela de "Acesso pendente — aguarde aprovação do administrador" em vez do conteúdo normal
- Oferecer botão de logout

### 4. `src/pages/LoginPage.tsx`
- Após signup, exibir mensagem informando que o acesso depende de aprovação do administrador (além da confirmação de email)

### 5. `src/pages/ConfiguracoesPage.tsx` — nova aba "Aprovações"
- Adicionar aba com ícone `UserCheck` ao lado das abas existentes
- Listar todos os perfis com `approved = false` (nome, email, data de cadastro)
- Botões para **Aprovar** (atualiza `approved = true`) e **Rejeitar** (deleta o perfil/usuário)
- Exibir contador de pendentes na aba (badge)

## Fluxo
```text
Novo usuário se cadastra → confirma email → faz login
→ vê tela "Acesso pendente de aprovação"
→ Admin vai em Configurações > Aprovações
→ Aprova o usuário → usuário recarrega e acessa normalmente
```

## Detalhes Técnicos
- A coluna `approved` fica na tabela `profiles` que já existe
- A verificação é feita no frontend (o RLS de `profiles` já permite leitura do próprio perfil)
- A aprovação pelo admin usa a policy pública existente ou uma nova policy para admin atualizar qualquer perfil

