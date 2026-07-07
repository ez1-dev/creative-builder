## Objetivo

Fazer o preview do diálogo refletir instantaneamente a série escolhida **e** garantir que o widget salvo use exatamente o mesmo mapping/opções — sem risco de a chave de série apontar para um dataset inexistente no `PageDataProvider`.

## Diagnóstico atual

Após o ajuste anterior os dropdowns já só oferecem séries com dados reais, mas ainda restam três descolamentos entre "o que vejo" e "o que salvo":

1. **Debounce global (150 ms)** em `ConfigureRhWidgetDialog` e `AddRhBiWidgetDialog` atrasa a atualização do preview quando o usuário troca componente/série. Percebido como "não mostra imediatamente".
2. **Save não sanitiza mapping**: o `onSave` envia o objeto inteiro; se o usuário mantiver uma chave herdada não coberta pelo schema efetivo, o widget é persistido "quebrado" — o grid disfarça remapeando na renderização, mas ao reabrir o diálogo o valor do dropdown fica vazio.
3. **Rótulos incoerentes**: em `RhDashboardWithBiLibrary`, quando a série vem do `derivedSeries`, o `seriesCatalog` já traz o label bonito; mas se vier só do backend (`series` como record) usamos `toLabel(key)`, que pode ficar diferente do que a Biblioteca BI usa no dropdown ao abrir a engrenagem novamente.

## Escopo

Apenas RH. Nenhuma mudança em Passagens, Frota, Comercial, Fiscal ou na Biblioteca BI genérica.

## Alterações

### 1. `src/components/rh/ConfigureRhWidgetDialog.tsx`
- Remover o debounce das seleções: `componentId`, `mapping` e `options` são passados **direto** para o preview (sem `setTimeout`). Mantém debounce só para o `title` (input de texto).
- Antes de chamar `onSave`, sanitizar o mapping:
  - Descartar entradas cujo `mapping[key]` não exista no `effectiveSchema.kpis`/`series` (fonte da input).
  - Reaplicar `def.autoMap(effectiveSchema)` para preencher inputs obrigatórios vazios após o descarte.
- Garantir que o `onSave` receba os mesmos objetos usados no render do preview (mesma referência de `mapping` e `options`).

### 2. `src/components/rh/AddRhBiWidgetDialog.tsx`
- Mesma remoção de debounce para `componentId`/`mapping`.
- Mesma sanitização de mapping antes do `onAdd`.

### 3. `src/components/rh/RhDashboardWithBiLibrary.tsx`
- Ao montar o `seriesCatalog` de fallback (série no formato record), aproveitar o label declarado em `page.schema.series` quando a chave bater — assim o dropdown mostra o mesmo rótulo antes e depois de salvar.
- Passar `page.schema` também ao helper para que `buildEffectiveSchema` respeite os rótulos oficiais.

### 4. `src/lib/rh/dialogSchema.ts`
- Expor helper `sanitizeMapping(def, mapping, schema)` reutilizado pelos dois diálogos e pelo grid. Retorna `{ mapping, changed }`, mantendo a lógica de descarte/autoMap num único lugar.
- `RhDashboardGrid` passa a usar esse helper (substitui o `Object.fromEntries` inline atual).

## Validação (Playwright, headless)

Rotina única aplicada às 6 rotas RH (`resumo-folha`, `quadro-colaboradores`, `contrato-experiencia`, `programacao-ferias`, `turnover`, `absenteismo`):

1. Entrar em "Editar layout" → abrir "Adicionar da Biblioteca BI".
2. Escolher **Gráfico de Barras**; confirmar que o preview renderiza com dados **na primeira frame** (screenshot antes de qualquer wait).
3. Trocar a série no dropdown; conferir que o preview atualiza imediatamente (screenshot pós-clique, sem `wait_for_timeout` extra).
4. Clicar em **Adicionar** e depois **Salvar edição**; recarregar a página.
5. Abrir a engrenagem do widget recém-criado; conferir que:
   - o dropdown de série está preenchido com a mesma chave escolhida,
   - o preview mostra o mesmo gráfico do grid,
   - o gráfico no grid tem os mesmos dados do preview.

Critério de aceite: nenhum screenshot com "Sem dados", nenhuma diferença visual entre preview do diálogo e widget no grid, dropdown volta preenchido ao reabrir.
