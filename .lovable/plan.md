## Objetivo
Adicionar preview ao vivo (com dados reais da página) no diálogo "Adicionar componente da Biblioteca BI" das páginas RH, igual ao que já existe no ConfigureRhWidgetDialog.

## Alterações

**Arquivo:** `src/components/rh/AddRhBiWidgetDialog.tsx`

1. Importar `usePageData` de `@/lib/bi/PageDataContext` e `WidgetErrorBoundary` (mesmo usado no Configure dialog) para renderização segura.
2. Debounce (~150ms) de `componentId`, `mapping` e `title` para evitar re-render a cada tecla.
3. `previewDef` via `useMemo` a partir do `debounced.componentId`; validar se todos os inputs obrigatórios estão preenchidos (`previewMappingReady`).
4. Nova seção "Pré-visualização" entre o campo Título e o Footer:
   - Se não houver componente: mensagem "Selecione um componente".
   - Se mapping incompleto: "Preencha os campos obrigatórios para ver o preview".
   - Caso ok: renderizar `<WidgetErrorBoundary>{previewDef.render({ id: 'preview', title, mapping, options: {}, pageData })}</WidgetErrorBoundary>` dentro de um container com altura fixa (ex.: `min-h-[280px]`).
5. Aumentar o dialog para `max-w-2xl max-h-[90vh] overflow-y-auto` para acomodar o preview.
6. Manter comportamento atual: automap ao trocar componente, botão Adicionar continua salvando o mesmo payload.

## Validação
- Rodar `tsgo` para checar tipos.
- Verificar no preview (rota `/rh/programacao-ferias`) abrindo "Adicionar componente" — preview deve refletir a escolha e o mapping em ~150ms.
