## Problema

Nos drawers de drill da DRE/Balanço, ao rolar o conteúdo o cabeçalho (título, período, filtros aplicados e barra de ações Copiar/CSV/XLSX) sai da tela, e o usuário perde o contexto do que está olhando.

Isso acontece principalmente em `DrillResultadoPanel` (drawer aberto pelo menu "LISTA DE DRILLS" → Consulta), cujo `SheetContent` usa `overflow-y-auto` no container inteiro — então TUDO rola junto, inclusive `SheetHeader` e a barra de ações.

O `DrillDrawer` (Razão) já tem o cabeçalho fora do container rolável, mas a barra de ações/contador de registros ainda precisa ser fixada logo abaixo do header para não sumir ao rolar.

## Objetivo

Manter sempre visíveis, no topo do drawer, enquanto o usuário rola verticalmente:

1. Título ("Drill — {linha}" / "Lançamentos") e descrição (período, código da linha, chips de filtros: codemp, codfil, consolidado, CCU, UN, modo).
2. Barra de ações do drill (contador de registros + botões Copiar / CSV / XLSX) e o aviso amarelo de "truncado", quando existir.

## Alterações (frontend apenas)

### 1) `src/components/dre-studio/DrillResultadoPanel.tsx`

- Trocar o `SheetContent` de `overflow-y-auto` para layout em coluna: `className="w-full sm:max-w-4xl p-0 flex flex-col"`.
- Envolver `SheetHeader` + o bloco de "truncado" + a barra de contador/ações (linhas ~247–276) em um wrapper único **fixo no topo**: `<div className="shrink-0 border-b bg-background px-6 pt-6 pb-3">`.
- Envolver a tabela, botão "Carregar mais" e o card de totais em um wrapper rolável: `<div className="flex-1 overflow-auto px-6 py-4">`.
- Manter o `TableHeader` da tabela com `sticky top-0` já herdado (adicionar `sticky top-0 bg-background z-10` se necessário) para que o cabeçalho da própria tabela também acompanhe.
- Os estados de loading / erro / vazio ficam dentro do wrapper rolável.

### 2) `src/components/dre-studio/DrillDrawer.tsx`

- O `SheetHeader` (linhas 298–333) já está fora do container rolável — mantém.
- Mover o bloco de contador "Mostrando X lançamentos" + botão "Aumentar limite" (linhas 391–414) para **fora** do `.flex-1 overflow-auto` (linha 335), renderizando-o como uma **subfaixa fixa** imediatamente abaixo do `SheetHeader`: `<div className="shrink-0 border-b bg-background px-4 py-2">`.
- Nenhuma alteração no `FloatingHScrollbar`, no rodapé de totais ou no `Dialog` de detalhe do lançamento.

### 3) Nada muda em

- Endpoints, hooks (`useDrillDre`, `useDrillLancamentos`, `useDrillLancamentos` do `api.ts`), tipos ou lógica de negócio.
- Menu "LISTA DE DRILLS" (`DrillsMenu`) — já é um popover pequeno, não precisa.
- Layout do drill de Balanço (usa o mesmo `DrillResultadoPanel`, então herda a correção).

## Verificação

- Abrir `/contabilidade/dre-studio/{id}/visualizacao`, clicar em uma linha drillável → menu de drills → escolher "Consulta → Conta Contábil": rolar a lista e confirmar via Playwright + screenshot que título, período, chips de filtros e barra de ações continuam visíveis.
- Abrir também o drill de Razão (Lançamentos) com muitas linhas e confirmar que "Mostrando N lançamentos" permanece fixo abaixo do cabeçalho azul.
