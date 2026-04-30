## Objetivo

Permitir que ao gerar um link de compartilhamento público de Passagens Aéreas o admin escolha quais gráficos/mapas o destinatário externo poderá ver. Hoje o link público ignora as restrições de "Ocultar Gráficos e Mapas por Perfil" porque essa configuração depende de usuário autenticado.

## Visão geral da solução

Adicionar uma lista de "visuais ocultos" diretamente em cada link de compartilhamento. No diálogo de criação, o admin marca/desmarca quais gráficos e mapas estarão visíveis. A página pública passa a respeitar essa lista usando o mesmo `VisualGate`, alimentado por um contexto local que não depende de auth.

## Mudanças

### 1. Banco de dados (migration)

- Adicionar coluna `hidden_visuals text[] not null default '{}'` em `passagens_aereas_share_links`.
- Atualizar `create_passagens_share_link` para receber `_hidden_visuals text[] default '{}'` e gravar no insert.
- Criar nova função `get_share_link_visuals(_token text) returns text[]` (SECURITY DEFINER, STABLE) que retorna o array `hidden_visuals` se o link for válido (`active`, não expirado). Sem exigir senha — saber quais blocos esconder não é dado sensível e simplifica o frontend.

### 2. UI de criação do link (`ShareLinksDialog.tsx`)

- Importar `VISUAL_CATALOG` de `src/lib/visualCatalog.ts` filtrando o módulo Passagens Aéreas (chaves `passagens.*`).
- Adicionar um bloco "Gráficos/Mapas visíveis no link" com checkboxes (todos marcados por padrão).
- No `handleCreate`, calcular `hiddenVisuals = catalog.filter(k => !checked[k])` e passar para a RPC `create_passagens_share_link`.
- Mostrar na tabela de links ativos uma coluna leve indicando se há restrição (ex.: "Todos" ou "N ocultos").

### 3. Página pública (`PassagensAereasCompartilhadoPage.tsx`)

- Após `loadData` bem-sucedido, chamar `supabase.rpc('get_share_link_visuals', { _token: effectiveToken })` e guardar como `Set<string>`.
- Criar um pequeno provider local `PublicVisualsContext` (em `src/contexts/PublicVisualsContext.tsx`) que expõe `canSeeVisual(key)` baseado no Set.
- Ajustar `VisualGate` (ou criar um wrapper `PublicVisualGate`) para preferir o contexto público quando presente, caindo no `useUserVisuals` apenas quando não houver. Implementação mais simples: `useUserVisuals` detecta se há `PublicVisualsContext` no provider tree e o usa em vez de consultar o Supabase autenticado. Assim `PassagensDashboard` e `MapaDestinosCard` continuam usando `<VisualGate visualKey="…">` sem mudanças.

### 4. Catálogo de visuais

- Confirmar que `src/lib/visualCatalog.ts` já lista as chaves `passagens.*` usadas no dashboard (mapa de destinos, KPIs, gráficos). Se faltar alguma chave referenciada nos componentes, acrescentar no catálogo para aparecer na UI de seleção.

## Arquivos envolvidos

- `supabase/migrations/<novo>.sql` (coluna + função)
- `src/components/passagens/ShareLinksDialog.tsx` (UI de seleção + chamada RPC)
- `src/pages/PassagensAereasCompartilhadoPage.tsx` (carregar visuais e prover contexto)
- `src/contexts/PublicVisualsContext.tsx` (novo)
- `src/hooks/useUserVisuals.ts` (consumir contexto público quando presente)
- `src/lib/visualCatalog.ts` (revisão das chaves de Passagens)
- `src/integrations/supabase/types.ts` (auto-gerado pela migração)

## Comportamento final

- Admin cria link → escolhe quais gráficos/mapas ficam visíveis → link gerado com restrição embutida.
- Destinatário externo abre o link → vê apenas o que foi liberado, mesmo sem login.
- Links já existentes continuam funcionando normalmente (default = todos visíveis).
