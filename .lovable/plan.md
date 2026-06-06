## Objetivo

Trazer para o **configurador do BI Comercial** (`ConfigureBiWidgetDialog`) as mesmas opções visuais avançadas que já existem no configurador da Manutenção de Frota / Passagens / Máquinas (`ConfigureChartDialog`), **sem perder** o que o BI Comercial já tem (variantes do catálogo, Biblioteca BI, multi-séries, cores de título/resultado).

Resultado: ao clicar em "Configurar bloco" em qualquer card do BI Comercial, o usuário enxerga as mesmas abas de aparência (Título, Legenda, Rótulos, Descrição, Eixos & Grade, Card) e a paleta de cor da série (Padrão / Sucesso / Aviso / Destaque / Acento / Suave + hex livre) que já aparecem no print enviado.

## Escopo

**Somente frontend / camada de apresentação.** Nada de backend, schema, RLS, edge functions ou alteração nos dados/séries.

### Arquivos a alterar

1. `src/components/bi/runtime/ConfigureBiWidgetDialog.tsx`
   - Adicionar dois estados novos: `color` (string, default `DEFAULT_CHART_COLOR`) e `visual` (`VisualConfig`, via `mergeVisualConfig(initial.options?.visual)`).
   - Importar `ChartColorPicker` (`@/components/passagens/ChartColorPicker`) e `VisualConfigEditor` (`@/components/bi/visual/VisualConfigEditor`), além de `DEFAULT_VISUAL_CONFIG / mergeVisualConfig / VisualConfig` de `@/lib/bi/visualConfig`.
   - Resetar esses estados quando o diálogo abre (mesmo padrão do `useEffect` existente).
   - **Aba "Biblioteca BI"**: na coluna esquerda, abaixo do título, mostrar o `ChartColorPicker` quando `libDef.id` estiver em `COLOR_AWARE_TYPES` (`bar-chart`, `horizontal-bar-chart`, `line-chart`, `area-chart`). Empacotar `options.color` no `previewNode` e no `handleApply` (modo `library`).
   - **Bloco "Aparência e leitura do gráfico"**: renderizar abaixo das abas (visível tanto em "Variante padrão" quanto em "Biblioteca BI") um container colapsado com scroll contendo `<VisualConfigEditor value={visual} onChange={setVisual} availableSeriesKeys={['valor']} />`. Mesma altura/estilo do `ConfigureChartDialog` (`max-h-[50vh] overflow-y-auto rounded-md border p-3`).
   - **Persistência**: ao aplicar, montar `options` incluindo `color` (se diferente do padrão e o componente suportar) e `visual` (se diferente de `DEFAULT_VISUAL_CONFIG`). Em modo `builtin`, manter `componentId: null` mas passar `options` quando o widget canônico aceitar (mesmo merge que hoje — quando `null` é descartado pelo backend de layout, o `visual`/`color` viaja no `options` que já é persistido em `config.options` no `dashboard_widgets`).
   - Aumentar `DialogContent` para `max-w-5xl max-h-[90vh] overflow-y-auto` (igual ao de Passagens) para caber o editor.

2. `src/components/passagens/ChartColorPicker.tsx`
   - Sem alteração. Apenas reutilizar.

3. `src/components/bi/visual/VisualConfigEditor.tsx`
   - Sem alteração. Apenas reutilizar.

### O que NÃO muda

- Abas existentes (Variante padrão / Biblioteca BI / Séries) e a edição multi-séries permanecem.
- Edição de cor de título/resultado (`titleAppearanceSection`) permanece — fica em paralelo ao novo painel "Aparência e leitura do gráfico" (são coisas diferentes: uma estiliza o cabeçalho do card, outra estiliza o conteúdo do gráfico).
- Catálogo de widgets, hooks de dados, drill, RPC, edge functions, FastAPI: nada disso é tocado.
- Configurador de Frota/Passagens/Máquinas: continua exatamente como está.

## Compatibilidade

- Widgets já configurados sem `options.visual` continuam renderizando idênticos: `mergeVisualConfig(undefined)` retorna o padrão e o JSON do `options` permanece sem a chave `visual`.
- Cards canônicos do BI Comercial que não passam por `COMPONENT_REGISTRY.render` ignoram `options.visual` naturalmente (as variantes built-in têm seu próprio render); a aparência avançada só passa a valer quando o card está em modo "Biblioteca BI". O `ChartColorPicker` também só se aplica a componentes da biblioteca compatíveis.
- Onde o usuário usar uma variante built-in que não consome `options.visual`, o painel fica visível e gravado, mas sem efeito visual até o card ser trocado para Biblioteca BI. Vou indicar isso com um pequeno texto auxiliar no topo do painel: "Estas opções têm efeito nos componentes da Biblioteca BI."

## Aceitação

1. Em `/bi/comercial`, ao "Configurar bloco" de qualquer gráfico, o diálogo mostra as abas atuais **+** o painel "Aparência e leitura do gráfico" idêntico ao do print de Frota (Título, Legenda, Rótulos, Descrição, Eixos & Grade, Card).
2. Na aba "Biblioteca BI", quando o componente selecionado é bar/horizontal-bar/line/area, aparece o `ChartColorPicker` (Padrão/Sucesso/Aviso/Destaque/Acento/Suave + hex).
3. As opções escolhidas são aplicadas no preview do diálogo e persistem após Aplicar + recarregar a página.
4. Widgets existentes continuam renderizando como antes (nenhum efeito até o usuário alterar algo).
5. Configurador de Frota/Passagens/Máquinas continua igual.