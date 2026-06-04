# Plano

## Objetivo
Eliminar os 3 avisos do DevTools nos diálogos do BI Comercial:
1. `A form field element should have an id or name` (autofill)
2. `No label associated with a form field` (label)
3. `Missing Description or aria-describedby for {DialogContent}` (shadcn Dialog)

## Escopo (apenas BI Comercial)
- `src/components/bi/runtime/AddBiWidgetDialog.tsx`
- `src/components/bi/runtime/ConfigureBiWidgetDialog.tsx`
- `src/components/bi/runtime/SeriesEditor.tsx`
- `src/components/bi/runtime/FormulaBuilder.tsx`
- `src/components/bi/runtime/ApplyComponentDialog.tsx`

## Mudanças

### 1. DialogDescription
Em cada `<DialogContent>` desses diálogos, garantir um `<DialogHeader>` com `<DialogTitle>` e `<DialogDescription>` (curta, explicando o que o diálogo faz). Quando a descrição já existir como texto solto, converter para `<DialogDescription>`.

### 2. id/name + Label nos campos
Para cada `<Input>`, `<Textarea>`, `<Select>` e `<Switch>` dentro desses diálogos:
- Adicionar `id` único (usar `useId()` quando estiver dentro de listas, ex.: linhas do `SeriesEditor`).
- Adicionar `name` semântico (`series-label`, `series-color`, `series-axis`, `formula-expression`, `widget-title`, etc.).
- Adicionar `<Label htmlFor={id}>` visível, ou `aria-label` quando o controle for inline e o label visual estaria duplicado (ex.: color picker em chip).
- Quando o controle for o `Select` do shadcn, usar `<Label htmlFor>` apontando para o `SelectTrigger` com o mesmo `id`.

### 3. Sem mudanças de comportamento
- Nenhum estado, layout ou estilo é alterado, só atributos de acessibilidade.
- Sem novos componentes; tokens semânticos do design system permanecem.

## Fora de escopo
- Outros diálogos do app (Biblioteca BI, Passagens, etc.).
- Avisos `postMessage` (do preview Lovable, já tratados).
- `apple-mobile-web-app-capable` (já tratado).

## Validação
Após aplicar:
- Abrir `/bi/comercial`, abrir Add/Configure Widget, Séries, Fórmula.
- Conferir no DevTools que os 3 avisos somem para esses diálogos.