

# Centralizar URL da API no banco para todos os usuários

## Problema atual
A URL da API (`erp_api_url`) é armazenada no `localStorage` de cada navegador. Ou seja, cada usuário precisa configurar manualmente. Quando você muda o ngrok, precisa atualizar em cada máquina.

## Solução
Usar a mesma tabela `app_settings` que já guarda `erp_api_user` e `erp_api_pass` para guardar também a URL da API (`erp_api_url`). Assim, o admin configura uma vez e todos os usuários usam.

## Alterações

### 1. `src/lib/api.ts` — Aceitar URL dinâmica
- Adicionar um setter `setApiBaseUrl(url)` que guarda a URL em memória (variável do módulo)
- `getApiBaseUrl()` usa: URL em memória → `VITE_API_URL` → `localhost:8000`
- Remover dependência do `localStorage` para a URL

### 2. `src/contexts/AuthContext.tsx` — Carregar URL do banco
- No `fetchProfile`, já faz query em `app_settings` para user/pass
- Adicionar `erp_api_url` na lista de keys buscadas
- Se existir, chamar `setApiBaseUrl(url)` antes do `api.login()`

### 3. `src/pages/ConfiguracoesPage.tsx` — Salvar URL no banco
- Alterar o campo "URL da API" para salvar em `app_settings` (upsert com key `erp_api_url`) em vez de `localStorage`
- Carregar o valor do banco ao abrir a página
- Pré-preencher com `https://flakily-wanning-faye.ngrok-free.dev`

### 4. Migração de dados
- Inserir a URL ngrok atual na tabela `app_settings`:
```sql
INSERT INTO app_settings (key, value) VALUES ('erp_api_url', 'https://flakily-wanning-faye.ngrok-free.dev')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## Resultado
- Admin configura a URL uma vez nas Configurações
- Todos os usuários usam automaticamente a URL correta
- Quando o ngrok mudar, basta atualizar no painel de configurações

