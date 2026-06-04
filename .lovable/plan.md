## Objetivo
Eliminar as piscadas/reloads visuais, garantir que auth/permissões carreguem apenas quando a sessão/usuário realmente mudar, manter geolocalização só por ação do usuário e corrigir os warnings restantes de acessibilidade de formulário.

## O que vou implementar

### 1) Estabilizar o fluxo de autenticação e profile
- Revisar `src/contexts/AuthContext.tsx` para garantir inicialização previsível da sessão.
- Ajustar o fluxo para que carregamento de profile/ERP rode apenas quando o `user.id` mudar de fato, não em todo refresh de token.
- Tornar updates de estado totalmente idempotentes:
  - evitar `setSession`, `setUser`, `setDisplayName`, `setErpUser`, `setApproved`, `setErpConnected` quando o valor não mudou;
  - remover qualquer churn desnecessário do `value` do provider.
- Validar que logs como `[Auth] profile loaded` e `[Auth] erp api ok` não se repitam por eventos irrelevantes.

### 2) Remover fan-out de carregamento de permissões
- Revisar `src/hooks/useUserPermissions.ts` e o padrão de uso nos consumidores.
- Hoje esse hook é chamado em múltiplos pontos globais (`ProtectedRoute`, `PostLoginRedirect`, `AppSidebar`, `AiAssistantChat`, páginas e botões), o que tende a disparar várias buscas iguais e repetir o log `[useUserPermissions] ready`.
- Vou centralizar/cachear o resultado de permissões para que a carga ocorra uma vez por usuário autenticado e seja reutilizada pelos componentes.
- Manter guards com `useRef` e comparação de payload para impedir recargas simultâneas e `setState` redundante.

### 3) Revisar hooks/efeitos relacionados a sessão
- Inspecionar e ajustar hooks que dependem de auth/permissões para evitar efeitos em cascata e dependências instáveis.
- Prioridade para pontos globais que amplificam rerender:
  - `src/components/ProtectedRoute.tsx`
  - `src/components/AppSidebar.tsx`
  - `src/components/AppLayout.tsx`
  - `src/components/erp/AiAssistantChat.tsx`
  - hooks correlatos que consultem backend com base em `erpUser`/`user.id`.
- Onde necessário, aplicar `useMemo`/`useCallback`/`useRef` e comparações rasas ou estruturais antes de atualizar estado.

### 4) Manter geolocalização somente por clique explícito
- Validar e finalizar o ajuste de `src/components/HeaderInfo.tsx` para que não exista chamada automática de geolocalização no carregamento.
- Preservar o botão “Usar minha localização” no `onClick`, com tratamento de erro e fallback local, sem qualquer chamada via `useEffect`.

### 5) Corrigir os warnings restantes de formulário
- Corrigir campos ainda sem associação adequada de label/id/name/aria-label.
- Prioridade para os arquivos já mapeados com alta chance de warning real:
  - `src/components/regras-senior/AlterarStatusRegraDialog.tsx`
  - `src/pages/regras-senior/RegraEditorPage.tsx`
  - `src/pages/PassagensAereasCompartilhadoPage.tsx`
  - `src/pages/relatorios/RelatoriosPublicadosPage.tsx`
  - `src/pages/relatorios/HistoricoExecucoesPage.tsx`
  - filtros em `src/pages/FaturamentoGeniusPage.tsx`
  - outros dialogs/listas/filtros apontados na varredura.
- Substituir `<label>` solto por `Label htmlFor`, adicionar `id`/`name` nos campos, e usar `aria-label` quando o campo não tiver label visual.
- Ajustar selects/switches/checkboxes para vínculos acessíveis consistentes.

### 6) Validar sem alterar regra de negócio
- Não mexer no erro `postMessage` do ambiente de preview, conforme solicitado.
- Validar que o app não pisca e que auth/permissões não entram em loop no preview.
- Fazer checagem final para garantir:
  - auth/permissões carregando uma vez por sessão/usuário;
  - ausência de geolocalização automática;
  - redução/eliminação dos warnings de label/id/name no console.

## Detalhes técnicos
- A principal causa provável do ruído atual é a combinação de:
  - `useUserPermissions()` sendo instanciado em muitos componentes ao mesmo tempo;
  - cargas repetidas baseadas em `erpUser` sem cache compartilhado;
  - atualizações de estado/contexto em auth ainda disparando rerenders globais.
- A correção vai priorizar arquitetura estável de leitura compartilhada de permissões, guards com `useRef`, dependências estáveis e updates idempotentes.
- Não vou alterar regra de negócio do ERP nem o comportamento funcional das telas, apenas a forma como carregam e renderizam.