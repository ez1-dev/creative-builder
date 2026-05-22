## Diagnóstico (OP 1109)

A OP 1109 está no modo **"Quebrar por operação"** com **mais de 7 componentes**. Dois bugs causaram o resultado da impressão:

### Bug 1 — Operação vai para a 2ª folha, deixando a 1ª quase vazia
Quando **não há componentes inline** (caso de >7 componentes), o código mantém `blocos = 6` no apontamento. 6 blocos (~192mm) + cabeçalho (~80mm) + título "Operação" estouram a altura útil A4 (~283mm). Como `.op-operation` tem `break-inside: avoid`, o navegador empurra o bloco inteiro da operação para a próxima folha — exatamente o que aparece no print enviado.

### Bug 2 — Página de componentes não fica por último
Hoje a folha de componentes é inserida **logo após a 1ª operação**. Quando a OP tem várias operações, os componentes ficam no meio (entre op1 e op2), não na última folha como pedido.

## O que vou fazer

1. **Reduzir blocos de apontamento na 1ª operação sem componentes inline** (`OpPrintSheet.tsx`, modo `quebrarPorOperacao`):
   - Manter a lógica atual para `temComponentesInline` (≤7 componentes).
   - Quando a 1ª operação não tem componentes inline mas **existem componentes em página separada** (>7), usar `blocos = 5` na 1ª folha para garantir que cabeçalho + operação caibam juntos.
   - Demais operações (sem cabeçalho extra de componentes) continuam com 6 blocos.

2. **Mover a página de componentes para o final** (`OpPrintSheet.tsx`):
   - Remover a inserção da folha de componentes logo após a 1ª operação.
   - Renderizar `renderComponentesPage()` **depois de todas as operações** e **antes dos desenhos**, ficando como última folha impressa antes dos desenhos (ou última de tudo, se não houver desenhos).

3. **Sem mudanças** em:
   - CSS (`op-print.css`) — regras de quebra já cobrem o cenário; só reduzimos o conteúdo.
   - Comportamento padrão (sem "quebrar por operação"), API, busca de OPs, desenhos.

## Ordem das folhas resultante (quebrar por operação + >7 componentes)

```text
Folha 1: cabeçalho + 1ª operação (5 blocos de apontamento)
Folha 2..N: demais operações (uma por folha, com cabeçalho, 6 blocos)
Folha N+1: cabeçalho + componentes  ← agora por último
Depois: desenhos (uma página A4 por desenho)
```

## Resultado esperado

- A 1ª folha terá cabeçalho + a 1ª operação completa, sem espaço vazio.
- A folha de componentes aparece **depois de todas as operações** (última antes dos desenhos), como pedido para a OP 1109.
- Validado nos 3 fluxos: impressão individual, "Visualizar selecionadas", "Imprimir visualização".

## Arquivos-alvo

- `src/components/producao/OpPrintSheet.tsx` (ajustes de `blocos` e reordenação do `renderComponentesPage`)
