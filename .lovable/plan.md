

# Corrigir Erro 422 no Assistente IA

## Causa raiz

A edge function `ai-assistant` funciona quando chamada diretamente (testei e retornou 200 com resposta válida). O erro 422 ocorre quando o SDK do Supabase (`supabase.functions.invoke`) envia a requisição com o token JWT do usuário, e a camada de relay do Supabase rejeita o token antes de chegar na function.

Isso acontece porque a plataforma Lovable Cloud deploya edge functions com `verify_jwt = false` por padrão, mas em alguns casos o deploy pode não ter aplicado essa configuração corretamente.

## Solução

Adicionar explicitamente a configuração `verify_jwt = false` no `supabase/config.toml` para a function `ai-assistant`, garantindo que o relay não bloqueie a requisição.

## Mudanças

### 1. `supabase/config.toml`
Adicionar bloco de configuração para a function:

```toml
[functions.ai-assistant]
verify_jwt = false
```

### 2. Re-deploy da edge function
Forçar o re-deploy da function para aplicar a configuração.

## Arquivos afetados
- `supabase/config.toml`

