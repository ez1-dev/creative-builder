## Diagnóstico

Na demo `/bi-components` os dois cards do mapa de calor (`BrazilHeatMap` e `BrazilHeatMapWidget`) aparecem com o rótulo "uso direto via import" e **sem** o botão "Aplicar". O `BrazilHeatMapWidget` continua envolto em `DemoBlock ... nonApplicable` (linha 541 da página), por isso o usuário não consegue aplicá-lo a uma página.

Além disso, na imagem fica claro que mesmo o card do `BrazilHeatMap` (já trocado para `WithApply componentId="brazil-heat-map"`) não está mostrando o botão "Aplicar" porque o `WithApply` usa `opacity-70 group-hover:opacity-100` num overlay absoluto — em monitores menores / com a UI mais densa, o botão fica praticamente invisível e dá a impressão de não existir.

## O que será corrigido

### 1. Demo do Mapa de Calor — habilitar Aplicar nos dois cards

Arquivo: `src/pages/BiComponentsDemoPage.tsx`

- Trocar o `DemoBlock name="BrazilHeatMapWidget" ... nonApplicable` por `<WithApply componentId="brazil-heat-map-comercial">`, mantendo título/subtítulo via props do próprio widget.
- Manter o card `BrazilHeatMap` em `WithApply componentId="brazil-heat-map"` (já feito).

### 2. WithApply — botão "Aplicar" sempre visível

Arquivo: `src/pages/BiComponentsDemoPage.tsx` (função `WithApply`)

- Remover o `opacity-70 group-hover:opacity-100` e deixar o botão sempre visível (igual ao botão do `DemoBlock`/`Compras por dia × hora` da imagem).
- Posicionar acima do título do card (z-10 mantido) para não cobrir o ícone de expandir.

### 3. Garantir que os dois IDs aparecem em alguma página compatível

Os componentes novos foram registrados como `kind: 'chart'`. Vou validar (somente leitura) em `src/lib/bi/pageRegistry.ts` que existe pelo menos uma página com seção `chart` — assim o dialog `ApplyComponentDialog` lista páginas de destino. Se nenhuma página compatível existir para `brazil-heat-map-comercial` (que tem `inputs: []`), basta a condição de `kind chart`, então não é necessário mudar nada lá; a verificação serve só para confirmar.

## Arquivos afetados

- `src/pages/BiComponentsDemoPage.tsx` — wrapper do segundo card + ajuste de visibilidade do botão em `WithApply`

Não muda:
- `componentRegistry.tsx`, `comercialWidgetCatalog.ts`, `BrazilHeatMap*`
- Backend / dados

## Resultado esperado

Ambos os cards do mapa de calor passam a exibir um botão "Aplicar" sempre visível no canto superior direito, abrindo o `ApplyComponentDialog` para escolher a página/seção/título e gravar em `bi_user_widgets`.
