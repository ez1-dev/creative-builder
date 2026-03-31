

# Credenciais da API Compartilhadas via Banco de Dados

## Problema
Hoje as credenciais da API ERP (`erp_api_user` e `erp_api_pass`) ficam em `localStorage`, ou seja, cada usuário precisa configurá-las manualmente no seu navegador. O correto é: o admin configura uma vez e todos os usuários usam automaticamente.

## Solução

### 1. Criar tabela `app_settings` no banco de dados
Tabela simples de chave/valor para armazenar configurações globais:
- `key` (text, primary key): ex. `erp_api_user`, `erp_api_pass`, `erp_api_url`
- `value` (text): o valor da configuração
- RLS: leitura para todos os autenticados, escrita apenas para admins

### 2. Alterar `AuthContext.tsx`
Em vez de ler de `localStorage`, buscar as credenciais da tabela `app_settings` no banco:
```
const { data } = await supabase.from('app_settings').select('key, value').in('key', ['erp_api_user', 'erp_api_pass']);
```

### 3. Alterar `ConfiguracoesPage.tsx` (aba API)
- Carregar e salvar credenciais no banco (`app_settings`) em vez de `localStorage`
- Manter campos de Usuário da API e Senha da API, mas agora persistidos globalmente
- A URL da API também pode migrar para o banco (opcional)

### 4. Manter compatibilidade
- Remover referências a `localStorage` para `erp_api_user` e `erp_api_pass`
- Qualquer usuário autenticado lê as credenciais; só admin grava

## Arquivos alterados
- **Migration SQL**: criar tabela `app_settings` com RLS
- `src/contexts/AuthContext.tsx`: buscar credenciais do banco
- `src/pages/ConfiguracoesPage.tsx`: salvar/carregar credenciais do banco

