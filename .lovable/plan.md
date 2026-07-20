## Objetivo
Hoje "Personalizar Menus" só permite mover uma página entre menus de topo (ERP, HCM, Configurações). Quando o destino é um menu **nested** (ex.: ERP), o item vai parar num subgrupo genérico "Personalizado". Queremos permitir escolher **exatamente o subgrupo** de destino — ex.: mover "BI Comercial" para dentro de **ERP → Faturamento**, logo abaixo de "Faturamento Genius".

## Escopo (apenas frontend / camada de layout)

### 1. Modelo de override (`src/hooks/useMenuLayout.tsx`)
- Estender `moves` para aceitar destino composto: `Record<string, { topId: string; subGroupId?: string }>`.
- Migração transparente: valor antigo `string` → `{ topId: string }` na leitura do localStorage (mantém compatibilidade, sem invalidar layouts salvos).
- `orders` passa a ser indexado por chave `${topId}` para tops flat/leaf e `${topId}:${subGroupId}` para subgrupos de menu nested. Fallback: ordem existente por topId continua válida para flats.

### 2. Aplicação do layout (`applyLayout`)
- Ao importar itens em um top **nested**, roteá-los para o `subGroupId` escolhido em vez do subgrupo "Personalizado". Se `subGroupId` não existir mais no catálogo, cair no subgrupo "Personalizado" como hoje.
- Aplicar `orders` por subgrupo (nested) além do atual `orders` por top (flat).
- Manter a criação do subgrupo "Personalizado" apenas quando o usuário não escolher subgrupo.

### 3. Tela `PersonalizarMenusPage`
- Para cada item, além do Select "Menu" (topo), adicionar um Select "Submenu" que aparece quando o topo escolhido é `nested`. Opções = subgrupos daquele top + "Personalizado (novo grupo)".
- Reordenação: os botões ↑/↓ passam a reordenar dentro do subgrupo real onde o item aparece (para nested) ou dentro do top (para flat). Atualiza a chave correta em `orders`.
- Ao renderizar a listagem de um top nested, agrupar as linhas por subgrupo com um subtítulo (ex.: "Faturamento"), para o usuário enxergar a hierarquia final que a sidebar vai mostrar.

### 4. Compatibilidade
- Layouts já salvos no localStorage continuam funcionando (leitura tolerante).
- Sidebar (`AppSidebar`) não precisa mudar — consome o resultado de `effectiveMenus`.

## Não faz parte
- Reordenar subgrupos entre si dentro de um top (fica igual ao catálogo).
- Criar novos subgrupos nomeados pelo usuário (só o "Personalizado" automático continua).
- Mudanças no `menuCatalog.ts` em si.

## Verificação
- Typecheck.
- Teste manual: mover "BI Comercial" para ERP → Faturamento, confirmar que aparece logo abaixo de "Faturamento Genius" na sidebar; recarregar a página e confirmar que persistiu; usar "Restaurar padrão" e confirmar que volta ao catálogo original.
