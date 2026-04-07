

# Permissão de Acesso ao Assistente IA

## Visão Geral

Adicionar uma coluna `ai_enabled` na tabela `access_profiles` (perfis de acesso) para que o administrador controle quais perfis têm acesso ao Assistente IA. O chat só aparece para usuários cujo perfil tenha essa permissão ativada.

## Mudanças

### 1. Migração de banco de dados
- Adicionar coluna `ai_enabled boolean NOT NULL DEFAULT false` na tabela `access_profiles`

### 2. Hook `useUserPermissions.ts`
- Buscar o campo `ai_enabled` do perfil do usuário (via `user_access` → `access_profiles`)
- Expor uma propriedade `canUseAi: boolean` no retorno do hook

### 3. `AiAssistantChat.tsx`
- Consumir `useUserPermissions()` e verificar `canUseAi`
- Se `false`, não renderizar o botão flutuante nem o chat

### 4. `ConfiguracoesPage.tsx` — Aba "Permissões por Tela"
- Adicionar uma linha extra "Assistente IA" na matriz de permissões (ou um Switch na aba de Perfis)
- O admin marca/desmarca `ai_enabled` por perfil usando um toggle

## Arquivos afetados
1. **Migração SQL** — `ALTER TABLE access_profiles ADD COLUMN ai_enabled boolean NOT NULL DEFAULT false`
2. **`src/hooks/useUserPermissions.ts`** — buscar `ai_enabled` e expor `canUseAi`
3. **`src/components/erp/AiAssistantChat.tsx`** — condicionar renderização a `canUseAi`
4. **`src/pages/ConfiguracoesPage.tsx`** — adicionar toggle de IA na matriz de permissões

