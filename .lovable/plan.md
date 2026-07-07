## Diagnóstico

Verifiquei as 6 páginas RH — todas usam `RhDashboardWithBiLibrary` com `derivedSeries` e o diálogo abre com o catálogo populado. O preview aparece vazio porque os *dropdowns* misturam duas fontes de chaves de série que **não batem entre si**:

- **Schema declarado** em `src/lib/bi/pageRegistry.ts` (ex.: `por_faixa`, `historico`, `serie_mensal`, `por_mes`, `mensal`…).
- **Chaves reais** produzidas pelos builders em `src/lib/rh/seriesBuilders.ts` (ex.: `por_faixa_etaria`, `historico_colaboradores`, `admissoes_por_mes`, `evolucao_mensal`…).

Nos diálogos `ConfigureRhWidgetDialog` e `AddRhBiWidgetDialog`, `seriesOpts` faz `mergeByKey(fromCatalog, fromSeries, page.schema.series)`. Isso mostra também as chaves do schema que **não têm dados**. Quando o usuário escolhe uma dessas, `mapping.series` fica com uma chave inexistente e `ctx.series?.[mapping.series]` retorna `undefined` → preview vazio (mesmo comportamento do widget final ao salvar).

Efeito colateral no `Configure`: se `widget.mapping.series` herdado for uma chave de schema sem dados (ex.: um layout default), o preview também nasce vazio até o usuário trocar manualmente.

## Escopo

Somente RH. Nenhuma mudança em Passagens, Frota, Comercial, Fiscal, Financeiro etc.

## Alterações

### 1. `src/components/rh/ConfigureRhWidgetDialog.tsx`
- Reescrever `kpisOpts` e `seriesOpts` para **priorizar dados reais**:
  - `kpisOpts` = união de `ctx.kpis` (rotulados via `page.schema.kpis` quando existir) + fallback do schema **apenas** se `ctx.kpis` estiver vazio.
  - `seriesOpts` = união de `ctx.seriesCatalog` + chaves de `ctx.series` (rotuladas via schema quando bater) + fallback do schema **apenas** se `ctx.series`/`seriesCatalog` estiver vazio.
- Ao inicializar (useEffect de `open`), se `widget.mapping.<input>` apontar para chave que não existe em `effectiveSchema`, descartar e usar `autoMapFor(initialComponentId)`.
- No `handleComponentChange`, garantir que `autoMapFor` só considere chaves com dados reais.

### 2. `src/components/rh/AddRhBiWidgetDialog.tsx`
- Aplicar a mesma regra em `effectiveSchema` (kpis/series só com dados reais, schema como fallback).
- `autoMap(effectiveSchema)` já passa a devolver mapping válido, evitando "Selecione os campos obrigatórios" ou preview vazio pós-seleção.

### 3. `src/components/rh/RhDashboardGrid.tsx` (defensivo)
- Ao renderizar widget final: se `mapping.series`/`mapping.kpi` não existir em `ctx.series`/`ctx.kpis`, tentar `autoMap` do componente com o schema efetivo antes de mostrar vazio. (Assegura que layouts antigos salvos com chaves órfãs se auto-recuperem.)

Sem mudanças em `pageRegistry`, `seriesBuilders`, `componentRegistry`, `PageDataContext` ou nas páginas RH.

## Validação

Rodar Playwright nas 6 rotas:
1. `/rh/resumo-folha`, `/rh/quadro-colaboradores`, `/rh/contrato-experiencia`, `/rh/programacao-ferias`, `/rh/turnover`, `/rh/absenteismo`.
2. Em cada uma: abrir "Editar layout" → "Adicionar da Biblioteca BI" → trocar componente para "Barras (agrupadas)" → escolher a primeira série sugerida → conferir screenshot com barras renderizadas.
3. Abrir a engrenagem em um widget existente → conferir que o preview aparece imediatamente (sem trocar nada).
4. Salvar e recarregar a página → widget continua exibindo dados.
