

# Corrigir "Failed to fetch" — Suporte Local + Preview

## Problema
O preview do Lovable roda na nuvem e não consegue acessar `localhost:8000`. Quando o usuário tenta fazer login, o `fetch` falha porque a API não é alcançável.

## Solução

### 1. Mensagem de erro amigável no login
Atualmente, o erro genérico "Failed to fetch" é exibido. Vamos interceptar esse erro específico e mostrar uma mensagem clara explicando que a API não está acessível, com instruções.

**Arquivo:** `src/pages/LoginPage.tsx`
- No `catch` do `handleSubmit`, detectar `TypeError` / "Failed to fetch" e exibir: *"Não foi possível conectar à API. Verifique se a API está rodando e acessível."*

### 2. Indicador de status da API na tela de login
Adicionar um pequeno badge que mostra se a API está online ou offline, fazendo um `fetch` para um endpoint de health check (ou simplesmente tentando um GET na raiz da API).

**Arquivo:** `src/pages/LoginPage.tsx`
- `useEffect` que faz `fetch(API_BASE_URL)` ao montar o componente
- Exibe badge verde "API Online" ou vermelho "API Offline" abaixo do formulário
- Mostra a URL configurada para o usuário saber para onde está apontando

### 3. Configuração flexível da URL da API
Adicionar um campo na tela de login que permite o usuário alterar a URL da API em tempo real (salva no localStorage), útil para quem usa ngrok ou IP interno.

**Arquivo:** `src/pages/LoginPage.tsx`
- Pequeno link "Configurar API" que expande um campo de texto com a URL atual
- Ao salvar, grava no `localStorage` e recarrega

**Arquivo:** `src/lib/api.ts`
- Ler `localStorage.getItem('erp_api_url')` como prioridade sobre `import.meta.env.VITE_API_URL`

### 4. Melhorar tratamento de erros no ApiClient
**Arquivo:** `src/lib/api.ts`
- Envolver o `fetch` do método `login` em try/catch para capturar `TypeError` (rede) e lançar erro com mensagem mais descritiva

## Resumo das alterações
| Arquivo | Mudança |
|---|---|
| `src/lib/api.ts` | URL dinâmica via localStorage + tratamento de erro de rede |
| `src/pages/LoginPage.tsx` | Badge de status da API + campo de configuração de URL + mensagem de erro melhorada |

