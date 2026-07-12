## Corrigir links quebrados do DRE Studio

O router em `src/App.tsx` define as rotas como `/contabilidade/dre-studio/:id/{estrutura|visualizacao|orcamento|conciliacao|editar}` — sem `/contabilidade/` duplicado e sem segmento `/modelo/`. Vou normalizar todas as 10 ocorrências detectadas para esse padrão.

### Alterações

**1. `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`** (linhas 1295, 1312)
- `/contabilidade/contabilidade/dre-studio-studio/modelo/${id}/estrutura` → `/contabilidade/dre-studio/${id}/estrutura`

**2. `src/pages/contabilidade/dre-studio/DreStudioConfiguracoesPage.tsx`** (linha 311)
- `/contabilidade/contabilidade/dre-studio-studio/modelo/${snap.modelo_id}/visualizacao` → `/contabilidade/dre-studio/${snap.modelo_id}/visualizacao`

**3. `src/pages/contabilidade/dre-studio/DreStudioModelosPage.tsx`** (linhas 105, 114, 221, 226)
- Navegações após criar DRE/Balanço padrão: `/contabilidade/dre-studio/modelo/${m.id}/estrutura` → `/contabilidade/dre-studio/${m.id}/estrutura`
- Links das ações Editar/Visualizar: `/contabilidade/contabilidade/dre-studio-studio/modelo/${m.id}/{editar|visualizacao}` → `/contabilidade/dre-studio/${m.id}/{editar|visualizacao}`

**4. `src/pages/contabilidade/dre-studio/DreStudioNovoPage.tsx`** (linha 31)
- `/contabilidade/dre-studio/modelo/${m.id}/estrutura` → `/contabilidade/dre-studio/${m.id}/estrutura`

**5. `src/pages/contabilidade/dre-studio/DreStudioModeloEditarPage.tsx`** (linhas 25, 28)
- Ambas as navegações: `/contabilidade/dre-studio/modelo/${id}/estrutura` → `/contabilidade/dre-studio/${id}/estrutura`

### Fora de escopo
- Sem mudanças no router (`App.tsx`), backend, autenticação, hooks ou lógica.
- Sem redirect legacy (usuário na rota errada precisará clicar novamente pelo menu).

### Verificação
- `rg "contabilidade/contabilidade|dre-studio/modelo/" src/` deve retornar zero.
- `tsgo` build check automático.
