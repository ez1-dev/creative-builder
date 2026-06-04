## Objetivo
Eliminar a piscada/recarregamento visual sem alterar regra de negócio, garantindo que autenticação e permissões carreguem apenas no início da sessão ou quando o usuário realmente mudar.

## O que vou implementar
1. **Estabilizar o AuthProvider**
   - Remover o gatilho duplicado de sessão inicial em `src/contexts/AuthContext.tsx`.
   - Fazer o carregamento do profile/ERP rodar apenas quando `user.id` mudar de fato.
   - Tornar as atualizações de estado idempotentes para não disparar render sem mudança real.
   - Revisar o fluxo `onAuthStateChange` + `getSession()` para impedir revalidação redundante.

2. **Eliminar fan-out de permissões no layout principal**
   - Consolidar a carga de permissões para ocorrer uma única vez por usuário autenticado.
   - Revisar `src/contexts/PermissionsContext.tsx`, `src/hooks/useUserPermissions.ts`, `src/components/ProtectedRoute.tsx`, `src/components/AppSidebar.tsx` e `src/components/erp/AiAssistantChat.tsx` para garantir consumo passivo do estado já carregado.
   - Remover dependências instáveis e evitar qualquer recálculo/carga repetida por múltiplos consumidores.

3. **Remover gatilhos de loop/reload indiretos**
   - Auditar e ajustar trechos no layout principal e autenticação que possam causar navegação/reload cíclico, incluindo `src/components/UpdateNotifier.tsx`, `src/pages/AuthCallback.tsx` e `src/pages/LoginPage.tsx`.
   - Garantir que `navigate`, `reload`, timers, polling e refetches não fiquem presos em efeitos recorrentes.
   - Não mexer no erro de `postMessage` do preview/editor, apenas ignorar como causa funcional.

4. **Geolocalização só por ação do usuário**
   - Confirmar e manter `src/components/HeaderInfo.tsx` sem chamada automática de geolocalização no carregamento.
   - Se existir outro ponto chamando geolocalização em `useEffect`, remover.

5. **Corrigir os labels restantes**
   - Corrigir os campos ainda sem associação correta de label em páginas/localizações encontradas na varredura, começando pelos formulários compartilhados e demais inputs/selects/textarea com warning real.
   - Garantir `id` + `name` + `Label htmlFor`, ou `aria-label` quando não houver label visual.

6. **Validar o comportamento final**
   - Verificar no preview que os logs de auth/permissões deixem de se repetir em cascata e que a tela pare de piscar.
   - Validar também fora do editor, no link publicado, para confirmar que o comportamento não depende do ambiente do preview.

## Detalhes técnicos
- Arquivos centrais já inspecionados: `AuthContext.tsx`, `PermissionsContext.tsx`, `useUserPermissions.ts`, `ProtectedRoute.tsx`, `AppLayout.tsx`, `AppSidebar.tsx`, `HeaderInfo.tsx`, `UserTrackingProvider.tsx`, `UpdateNotifier.tsx`, `AuthCallback.tsx`, `LoginPage.tsx`.
- Achados principais:
  - `AuthContext` ainda faz tratamento duplicado da sessão inicial (`onAuthStateChange` + `getSession()`), o que pode gerar re-render extra mesmo sem novo usuário.
  - O provider de auth ainda atualiza vários estados separados durante o bootstrap, aumentando churn visual.
  - O provider de permissões já centraliza parte do problema, mas ainda precisa blindagem extra contra recargas/re-execuções e consumo em cascata no layout.
  - `HeaderInfo` não está mais pedindo geolocalização automaticamente.
  - Há labels restantes sem `htmlFor`/`id` em arquivos como os compartilhados de manutenção, além de outros formulários antigos que precisam de saneamento.

## Resultado esperado
- Sem piscada visual no carregamento normal.
- Sem loop de `useEffect` em auth/permissões.
- `loadProfile`, `checkErpApi` e `loadPermissions` executando uma vez por sessão/usuário.
- Sem geolocalização automática.
- Warnings restantes de label removidos.