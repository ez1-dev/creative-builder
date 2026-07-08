## Diagnóstico

O preview do widget de Escolaridade (e de qualquer breakdown RH via Biblioteca BI) mostra os dados **reais** vindos do `PageDataContext` — as barras (~90 a ~360) são a contagem real de colaboradores por escolaridade. Só que o eixo aparece com prefixo **R$**, e é isso que dá a impressão de que os dados são "de teste" ou irreais.

A causa está em `src/lib/bi/componentRegistry.tsx`, na função `formatterForSeriesKey(key)`:

- Ela olha o sufixo `__<metric>` da chave da série (padrão usado em Frota/Comercial: `mensal__faturamento`, `por_maquina__valor` etc.).
- Para chaves sem esse sufixo, cai no `default: return formatCurrency`.
- As séries de RH têm chaves como `por_escolaridade`, `por_sexo`, `por_vinculo`, `historico` — nenhuma casa com os sufixos conhecidos, então **tudo é renderizado como R$**, inclusive contagens de headcount, taxas e outros indicadores não-monetários.

Além disso, o formato definido pelo usuário na aba "Aparência" (`options.valueFormat`) e o `format` declarado no schema da página (`page.schema.series[].format` / `kpis[].format`) hoje **não influenciam** o formatter usado pelos componentes de chart da Biblioteca BI — só o sufixo da chave.

## Plano

Objetivo: fazer o preview (e o widget salvo) usar o formato correto por padrão nas páginas RH e permitir que o usuário sobrescreva pela aba Aparência, sem regredir os módulos Comercial/Frota que já dependem do sufixo `__metric`.

### 1. `src/lib/bi/componentRegistry.tsx` — resolver formatter em 3 camadas

Substituir as chamadas atuais `formatterForSeriesKey(mapping.series)` (nos 12+ `render` de charts) por um único helper novo `resolveSeriesFormatter({ key, options, schemaFormat })` com esta ordem:

1. `options.valueFormat` (definido pelo usuário na aba Aparência): `currency` → `formatCurrency`, `number` → `formatNumber`, `percent` → `formatPercent`, `compact` → `formatCompact`.
2. Sufixo conhecido da chave (`__pct`, `__qtd`, `__valor`, `__km`, …) — mantém a heurística atual para Frota/Comercial.
3. `schemaFormat` — quando a página declara `format: 'number' | 'percent' | 'currency'` na série (a ser adicionado ao schema RH).
4. Fallback: **`formatNumber`** (0 decimais), não mais `formatCurrency`. Assim, qualquer série RH sem metadados vira contagem inteira em vez de R$.

Nenhuma mudança nos `render` além de trocar a linha do `valueFormatter`.

### 2. `src/lib/bi/pageRegistry.ts` — declarar `format` nas séries RH

Adicionar o campo opcional `format?: 'number' | 'percent' | 'currency'` ao tipo de série do schema (já existe em `kpis`) e preencher nas páginas RH:

- `rh-quadro`: todas `por_*`, `historico` → `number`.
- `rh-absenteismo`: `taxa_abs` (kpi) já é percent; séries `por_mes/por_categoria/por_empresa/por_motivo` → `number`.
- `rh-contratos-exp`, `rh-ferias`, `rh-turnover` → `number` para contagens; qualquer série de custo → `currency` (a confirmar caso a caso lendo o schema atual).
- `rh-resumo-folha`: manter séries de `custo_*` como `currency`; contagens (`quantidade_*`, `admissoes`, `demissoes`) como `number`.

Esse campo é lido pelo helper novo (camada 3). Comercial/Frota continuam funcionando pela camada 2 (sufixo).

### 3. Diálogos RH — expor "Formato do valor" também para charts

Hoje o `VALUE_FORMATS` no `ConfigureRhWidgetDialog.tsx` só aparece para KPIs (via `isKpi`). Estender para `kind === 'chart'`:

- Mostrar o mesmo `Select` "Formato do valor" quando `def.kind === 'chart'` (e também em `AddRhBiWidgetDialog.tsx`).
- Persistir em `options.valueFormat`, que a camada 1 do helper já vai consumir.
- Rótulo/tooltip: "Como formatar os valores do gráfico".

### 4. Verificação (Playwright)

Roteiro após implementação, em cada página RH (`rh-quadro`, `rh-absenteismo`, `rh-contratos-exp`, `rh-ferias`, `rh-turnover`, `rh-resumo-folha`):

1. Entrar em modo de edição, abrir **Configurar** no widget de breakdown (ex.: Escolaridade em Quadro).
2. Confirmar via screenshot que a pré-visualização mostra o eixo em **números inteiros** (sem R$) para contagens.
3. Trocar a série para uma métrica de custo (se houver, em Resumo Folha) e confirmar que volta a exibir R$.
4. Na aba Aparência, mudar "Formato do valor" para percentual e conferir que o eixo passa a `%`.
5. Salvar e conferir que o widget na grade herda o mesmo formatter.

### Arquivos afetados

- `src/lib/bi/componentRegistry.tsx` — novo helper `resolveSeriesFormatter`, substitui chamadas.
- `src/lib/bi/pageRegistry.ts` — adiciona `format` opcional às séries RH.
- `src/components/rh/ConfigureRhWidgetDialog.tsx` — expõe "Formato do valor" para charts.
- `src/components/rh/AddRhBiWidgetDialog.tsx` — idem.

### Fora de escopo

- Não mexer em Comercial/Frota/Compras/Contabilidade.
- Não mudar a estrutura de `options.visual` nem o `VisualConfigEditor`.
- Não alterar `previewData.ts` (mock) — o preview já usa dados reais quando o `PageDataProvider` está montado; o problema aqui é só de formatação.
