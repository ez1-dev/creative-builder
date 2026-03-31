

# Corrigir: tela desaparece ao consultar dados (ERP API 401)

## Problema
Quando o usuário tenta consultar dados (ex: Estoque), a chamada vai para a API ERP externa. Como não existe `erp_token` no localStorage (o login agora é via Supabase, não pela API ERP), a API retorna 401. O código em `src/lib/api.ts` linha 64-67 reage ao 401 fazendo `window.location.href = '/login'` — a tela "desaparece".

## Solução

### 1. Alterar `src/lib/api.ts` — Não redirecionar ao `/login` no 401
- Remover o `window.location.href = '/login'` do tratamento de 401
- Remover o `this.logout()` (que limpa tokens do localStorage mas não tem relação com Supabase auth)
- Apenas lançar um erro com mensagem clara: `"Sessão da API ERP expirada. Verifique a conexão da API nas Configurações."`
- O usuário verá um toast de erro mas a tela não vai desaparecer

### 2. Adicionar login automático na API ERP após login Supabase
- Em `src/contexts/AuthContext.tsx`, após o `fetchProfile` retornar o `erp_user`, fazer automaticamente o login na API ERP usando o `erp_user` como credencial
- Chamar `api.login(erpUser, erpUser)` ou equivalente para obter o `erp_token`
- Isso garante que o token da API ERP esteja disponível quando o usuário navegar para as telas de consulta

### Resultado
- O 401 da API ERP não vai mais redirecionar para `/login` nem "sumir" com a tela
- O token da API ERP será obtido automaticamente após login Supabase

