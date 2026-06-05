## Objetivo

Tornar a escolha do **bloco** (KPIs / Gráficos / Tabelas) explícita e visível no diálogo "Aplicar componente" da Biblioteca BI, deixando claro em qual área da página o componente vai aparecer.

Hoje já existe o combo "Seção" em `ApplyComponentDialog.tsx`, mas:
- O rótulo "Seção" é genérico e passa despercebido.
- É um `<Select>` pequeno, fácil de ignorar.
- Não fica claro o que cada bloco significa nem quantos componentes ele já tem.

## Mudanças (somente UI / frontend)

Arquivo: `src/components/bi/runtime/ApplyComponentDialog.tsx`

1. **Renomear "Seção" → "Bloco da página"** em label, placeholder e no resumo da pré-visualização.

2. **Trocar o `<Select>` por um seletor visual em cards** (radio cards), um por bloco compatível com o `kind` do componente. Cada card mostra:
   - Ícone do tipo (KPI / Chart / Tabela) com cores semânticas do design system.
   - Nome do bloco (ex.: "Linha de KPIs", "Linha de gráficos", "Tabelas auxiliares").
   - Mini-descrição ("Aceita: kpi", "Aceita: chart, map, tree", etc.).
   - Estado selecionado destacado com `border-primary` e `ring`.

3. **Empty state**: se a página alvo não tem bloco compatível com o componente, mostrar aviso usando `AlertTriangle` + texto orientando trocar de página (a lista de páginas compatíveis já é filtrada, mas reforçamos a mensagem).

4. **Resumo da pré-visualização** (coluna direita): trocar `Seção: <key>` por `Bloco: <label legível>` usando o `label` da `PageSection` ao invés do `key`.

5. **Acessibilidade**: usar `role="radiogroup"` com `role="radio"` nos cards, `aria-checked`, navegação por teclado (setas) e `aria-label` no grupo.

## Fora de escopo

- Não criar novos tipos de bloco nem sub-blocos customizados (foi descartado na pergunta).
- Não mexer em `pageRegistry.ts`, `componentRegistry`, `useUserWidgets` nem em qualquer lógica de salvar / renderizar widgets.
- Não tocar em FastAPI, ETL ou Cloud.

## Critérios de aceitação

- No diálogo "Aplicar componente", o usuário vê claramente um seletor de **Bloco** com cards visuais.
- Selecionar um card atualiza `section` no estado e o resumo da direita mostra o nome amigável do bloco.
- Só aparecem blocos compatíveis com o `kind` do componente.
- Salvar continua funcionando exatamente como hoje (mesma chamada `createUserWidget`).
