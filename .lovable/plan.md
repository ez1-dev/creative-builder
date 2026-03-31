

# Credencial Única da API ERP

## Problema
O sistema usa `erp_user` como login e senha na API ERP (`api.login(erp_user, erp_user)`). Mas a API ERP espera uma credencial técnica única, não o login individual de cada usuário. Isso causa "Conexão ERP indisponível" para todos.

## Solução

### 1. Armazenar credenciais da API na aba Configurações → API
Na aba "API" que já existe, adicionar dois campos:
- **Usuário da API** (ex: `admin`)
- **Senha da API** (ex: `senha123`)
- Botão "Salvar Credenciais"
- Valores salvos em `localStorage` (`erp_api_user` e `erp_api_pass`)

### 2. Alterar o login automático no AuthContext
Em vez de `api.login(data.erp_user, data.erp_user)`, usar as credenciais salvas:
```
const apiUser = localStorage.getItem('erp_api_user');
const apiPass = localStorage.getItem('erp_api_pass');
if (apiUser && apiPass) {
  await api.login(apiUser, apiPass);
}
```

### 3. Manter o `erp_user` para permissões
O campo `erp_user` continua sendo usado para o sistema de permissões (tabela `user_access`), sidebar, etc. Apenas a autenticação na API ERP muda.

## Arquivos alterados
- `src/contexts/AuthContext.tsx` — login automático usa credenciais globais
- `src/pages/ConfiguracoesPage.tsx` — campos de credencial na aba API

## Observação
As credenciais ficam em `localStorage` (como já é feito com a URL da API). Somente admins têm acesso à aba de configurações.

