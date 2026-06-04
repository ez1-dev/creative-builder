# Plano

## O que acontece
O erro `Failed to execute 'postMessage' on 'DOMWindow'` aparece no script de preview do Lovable durante o retorno do login por magic link. Pelos logs, a autenticação do app em si conclui: o perfil carrega, a API ERP conecta e as permissões ficam prontas. Ou seja, o fluxo principal está funcionando e o erro parece ser específico do ambiente de preview.

## O que vou ajustar
1. Validar o fluxo para não depender de timing frágil no `/auth/callback`
   - Trocar a espera fixa de 400ms por uma checagem mais resiliente da sessão antes de redirecionar.
   - Garantir fallback limpo para `/login` apenas quando realmente não houver sessão.

2. Reduzir ruído e evitar falsa percepção de falha
   - Ajustar a tela `/auth/callback` para refletir corretamente o provedor usado.
   - Remover o aviso de meta tag deprecated adicionando `mobile-web-app-capable` junto do existente.

3. Conferir se há algo do app agravando o problema no preview
   - Revisar se o redirect final do callback está sempre coerente com a origem permitida.
   - Confirmar que não existe navegação duplicada entre `AuthCallback`, `AuthProvider` e redirecionamento pós-login.

## Resultado esperado
- O login continua funcionando.
- O callback fica mais estável.
- O warning de meta tag some.
- Se o `postMessage` continuar aparecendo só no preview, vamos tratar isso como limitação do ambiente de preview, não como erro do app.

## Detalhes técnicos
- Arquivos-alvo prováveis:
  - `src/pages/AuthCallback.tsx`
  - `index.html`
- Pontos já verificados:
  - `src/pages/LoginPage.tsx` usa a função `azure-auth-start`
  - `supabase/functions/azure-auth-callback/index.ts` redireciona para `/auth/callback`
  - `src/contexts/AuthContext.tsx` já recebe sessão e carrega perfil com sucesso
- Evidência do diagnóstico:
  - Logs mostram `[Auth] profile loaded`, `[Auth] erp api ok` e `[useUserPermissions] ready` após o callback, indicando sessão ativa apesar do erro do preview.