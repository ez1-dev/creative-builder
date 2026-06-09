# Right-click no KPI Impostos: ir direto pro Detalhamento de Impostos

## Diagnóstico

Hoje o menu de contexto (botão direito) dos widgets do BI Comercial mostra:
1. Cabeçalho com o nome do drill atual (ex.: "DETALHES IMPOSTOS")
2. "Clique esquerdo: filtrar" (desabilitado, só informativo)
3. Submenu "Detalhar em…" listando os **próximos** drills (NEXT_DRILLS)

Falta uma ação top-level que abra o drill **do próprio widget**. No KPI de Impostos isso faz com que o usuário precise usar o clique esquerdo (ou descer pelo submenu pra encontrar outro nível) — não dá pra ir direto no Detalhamento de Impostos pelo menu.

## Mudança

Arquivo: `src/components/bi/runtime/ChartContextMenu.tsx`

Adicionar, logo abaixo do item informativo "Clique esquerdo: filtrar" e antes do submenu "Detalhar em…", um item top-level:

```
Detalhar em {DRILL_LABELS[drillType]}
```

Comportamento:
- Só renderiza quando `drillType` está definido e está em `ENABLED_DRILLS`.
- `onSelect` chama `onOpenDrill(drillType)` — mesmo handler do clique esquerdo do KPI, que já abre o drawer no drill correspondente com `resetDrillFilters` (lógica fica no caller).
- Ícone de filtro, mesmo estilo dos demais itens.
- Separador entre esse item primário e o submenu "Detalhar em…".

Resultado no KPI Impostos (drillType = `DETALHES_IMPOSTOS`):
1. Clique esquerdo: filtrar (info)
2. **Detalhar em Detalhes Impostos**  ← novo, primeiro item acionável
3. Detalhar em… (submenu com os demais níveis)
4. Limpar todos os filtros (quando houver)

Como `widgetDrillType()` em `ComercialPage.tsx` já define o drill correto pra cada widget (KPI, mensal, estados, revendas etc.), a mesma melhoria aparece em todos os widgets — o primeiro item do menu sempre será "abrir o drill desse widget", o que é o comportamento esperado.

## Fora de escopo

- Backend, API, filtros, contrato de drill, drawer.
- `ComercialPage.tsx` e demais arquivos.
- Lógica de `KPI_DRILL_MAP` / `NEXT_DRILLS`.

## Critérios de aceite

- Botão direito no KPI Impostos mostra "Detalhar em Detalhes Impostos" como **primeira** ação acionável.
- Clicar nesse item abre o drawer no drill `DETALHES_IMPOSTOS` (mesmo resultado do clique esquerdo).
- Submenu "Detalhar em…" continua listando os próximos níveis.
- Outros widgets ganham coerentemente o mesmo item top-level com o label do próprio drill.
- Sem React #310, sem erros de console.
