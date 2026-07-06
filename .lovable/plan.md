## Objetivo

No diálogo "Configurar" de cada card RH, adicionar um preview ao vivo do componente selecionado, usando os dados reais que a página já carrega. Vale para todas as páginas RH (Resumo Folha, Quadro, Contrato de Experiência, Programação de Férias, Turnover, Absenteísmo).

## Como funciona hoje

- O `ConfigureRhWidgetDialog` já é renderizado dentro do `PageDataProvider` (via `RhDashboardWithBiLibrary`), então tem acesso a `usePageData()` — os mesmos `kpis`, `series`, `rows` e `filtros` que os cards do dashboard consomem.
- O usuário escolhe um componente da Biblioteca BI + faz o mapping (KPI/série) + define título, mas só vê o resultado depois de salvar.

## Mudança

Renderizar, dentro do próprio diálogo, o mesmo componente que seria salvo — com o mapping atual — em uma área "Pré-visualização" que reage em tempo real às escolhas.

### Detalhes de UI

- Painel de preview abaixo dos campos, altura fixa (~260px), com borda + `bg-muted/30` + label "Pré-visualização".
- Ampliar o `DialogContent` para `max-w-2xl` (comporta preview + formulário).
- Estados:
  - Sem `componentId` escolhido: mensagem "Escolha um componente para ver o preview".
  - Mapping obrigatório faltando: mensagem "Selecione os campos obrigatórios para ver o preview".
  - Ok: renderiza `def.render({ title, mapping, options: { filtros: ctx.filtros }, ctx: { kpis, series, rows } })` dentro de um `<Card>` + `WidgetErrorBoundary` (mesmo padrão do `RhDashboardGrid`) para isolar erros de render.
  - Se `usePageData()` retornar `null` (fora do provider — não ocorre no fluxo atual, mas defensivo): mensagem "Preview indisponível fora da página".

### Comportamento

- Debounce curto (~150ms) no `mapping`/`componentId` para evitar re-render excessivo durante seleção.
- Nenhuma escrita/save é feita pelo preview — só leitura de contexto e render puro.
- Botão "Salvar" continua igual; o preview é auxiliar.

## Arquivos alterados

- `src/components/rh/ConfigureRhWidgetDialog.tsx` — novo bloco de preview + import de `usePageData`, `getComponent` e `WidgetErrorBoundary`; ampliar `max-w-lg` → `max-w-2xl`.

## Fora de escopo

- Não altera o `AddRhBiWidgetDialog` (adicionar da Biblioteca) — pode ser feito depois se você quiser o mesmo lá.
- Não muda pageRegistry, catálogos, dados nem edge functions.
- Não muda o comportamento de save nem persistência.

## Validação

- Em `/rh/resumo-folha` → Editar layout → ⚙ em "Evolução Mensal do Custo": escolher `line-chart`, `area-chart`, `bar-chart` — o preview mostra o gráfico com os dados reais da série mensal.
- Trocar o mapping (ex.: KPI) e ver o preview atualizar.
- Repetir em `/rh/quadro-colaboradores` (breakdowns), `/rh/turnover` (série + tabela), `/rh/absenteismo`, `/rh/contrato-experiencia`, `/rh/programacao-ferias`.
