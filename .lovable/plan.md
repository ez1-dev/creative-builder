# Corrigir simetria/altura uniforme dos KPI Cards em Passagens Aéreas

## Problema (confirmado pela imagem)

No grid `grid-cols-4 items-stretch` (linha 510 de `src/components/passagens/PassagensDashboard.tsx`), o card **Registros** aparece visivelmente mais alto que os outros 3:

- O wrapper externo `<div className="relative">` (linha 548) não tem `h-full`, então não estica para ocupar toda a célula do grid.
- Mesmo se esticasse, o `KPICard` internamente é envolvido por um `motion.div` (`framer-motion`) sem `h-full`, e o `Card` interno também não tem `h-full`. Resultado: os 3 cards "limpos" assumem altura natural igual, mas o card Registros (com subtitle "16 Centro de Custos") fica mais alto pelo conteúdo extra, e os outros não acompanham.
- `items-stretch` no grid só estica os **filhos diretos** — ele não propaga para netos/bisnetos.

## Solução

Propagar `h-full` por toda a cadeia de wrappers do KPICard e ajustar o card Registros para que os 4 cards fiquem com a mesma altura, definida pelo mais alto.

### 1) `src/components/erp/KPICard.tsx`

- No `motion.div` (linhas 67–75): adicionar `className="h-full"`.
- No `<Card>` interno (linha 37): incluir `h-full` nas classes.
- No `<CardContent>` (linha 38): trocar `p-4` por `flex h-full flex-col justify-center p-4` para que o conteúdo fique centralizado verticalmente quando o card é esticado pelo grid.
- Nos wrappers `<div>` que aparecem em volta do `cardContent` quando há `tooltip`/`details` (linhas 58, 65, 82, 84): adicionar `h-full` para não quebrar a cadeia de altura.

### 2) `src/components/passagens/PassagensDashboard.tsx`

- Linha 548: `<div className="relative">` → `<div className="relative h-full">` para que o wrapper desktop do card Registros estique para ocupar a célula inteira.
- Linha 513 (caminho mobile): `<div className="flex flex-col gap-2">` — manter como está; mobile usa stack vertical e altura uniforme não importa.

### Resultado esperado

Os 4 KPI cards (Total Geral, Registros, Colaboradores, Ticket Médio) ficam exatamente da mesma altura, com o conteúdo verticalmente centralizado. O Select "Centro de…" + botão Layers permanecem absolutamente posicionados no canto superior direito do card Registros, sem afetar o layout dos vizinhos.

## Arquivos afetados

- `src/components/erp/KPICard.tsx` — propagação de `h-full` e centralização vertical do conteúdo.
- `src/components/passagens/PassagensDashboard.tsx` — `h-full` no wrapper do card Registros (apenas no caminho desktop, linha 548).

## Fora do escopo

- Não alterar lógica do KPICard (variantes, tooltip, popover, animação).
- Não mexer em outros usos do `KPICard` em outras páginas — adicionar `h-full` é seguro porque só tem efeito quando o pai tem altura definida (caso contrário, vira `100%` de auto = sem efeito).
- Não mexer no caminho mobile dos KPIs.
