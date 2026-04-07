

# Logs de Erros na página de Configurações

## O que será feito
Criar uma nova aba **"Logs"** na página de Configurações que captura e exibe erros da aplicação (erros de API ERP, erros de autenticação, erros JS) em uma tabela, permitindo diagnóstico rápido.

## Como funciona
1. Um serviço global intercepta erros (chamadas à API ERP que falham, erros não tratados do JS) e os armazena numa tabela no banco de dados.
2. Na aba "Logs" em Configurações, o administrador vê a lista de erros recentes com data/hora, usuário, módulo/página, mensagem de erro e status HTTP.
3. Filtros por data, módulo e nível (erro/aviso) ajudam a encontrar problemas rapidamente.

## Implementação

### 1. Criar tabela `error_logs` no banco
- Colunas: `id`, `created_at`, `user_email`, `module` (página/endpoint), `message`, `status_code`, `details` (JSON opcional)
- RLS: somente admins podem ler; insert aberto para `authenticated` (para o próprio app gravar)

### 2. Criar serviço `src/lib/errorLogger.ts`
- Função `logError({ module, message, statusCode, details })` que insere na tabela `error_logs`
- Busca o email do usuário logado via Supabase auth

### 3. Integrar no `api.ts`
- No método `request()`, quando uma chamada falha (catch ou response não ok), chamar `logError()` automaticamente com endpoint, status e mensagem de erro
- Isso captura todos os erros de comunicação com a API ERP sem alterar cada página

### 4. Nova aba "Logs" em `ConfiguracoesPage.tsx`
- Ícone `FileWarning` + label "Logs"
- Tabela com colunas: Data/Hora, Usuário, Módulo, Status, Mensagem
- Filtro por período (últimas 24h, 7 dias, 30 dias)
- Botão "Limpar logs antigos" (deleta registros > 30 dias)
- Paginação simples (últimos 100 registros por padrão)
- Badge no tab mostrando quantidade de erros nas últimas 24h

### 5. Capturar erros JS globais (opcional)
- Listener `window.onerror` e `window.onunhandledrejection` em `main.tsx` para gravar erros inesperados do frontend

## Arquivos afetados
- **Nova migração SQL** — tabela `error_logs` + RLS
- **Novo** `src/lib/errorLogger.ts`
- **Editado** `src/lib/api.ts` — interceptar erros
- **Editado** `src/pages/ConfiguracoesPage.tsx` — nova aba Logs
- **Editado** `src/main.tsx` — listener de erros globais

