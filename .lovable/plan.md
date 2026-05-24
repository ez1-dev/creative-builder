## Problema

O card "Fila de OPs por situação" (`FilaSituacaoCard`) está mostrando `?` porque lê `r.sitop` e `r.numop` — mas o endpoint `GET /api/producao/carga/detalhe` retorna na verdade **`sitorp`** e **`numorp`** (e a chave única vem como **`op_chave`**). Como os campos não existem na resposta, todo registro cai no fallback `'?'` e o agrupamento vira uma única fatia gigante.

## Correção

### 1. Tipos (`src/lib/producao/cargaApi.ts`)
Atualizar `CargaDetalheRow`:
- Renomear `numop: string|number` → `numorp: string|number`.
- Renomear `sitop: string` → `sitorp: string`.
- Adicionar `op_chave?: string`.
- Manter `numop`/`sitop` como `?` opcionais para não quebrar usos legados em outras telas até confirmar (uso pesquisado abaixo).

Onde `sitop`/`numop` são lidos hoje:
- `FilaSituacaoCard.tsx` — corrigido nesta tarefa.
- `DetalheOpsTab.tsx` — se ler `sitop`/`numop` em colunas, ajustar leitura para preferir `sitorp`/`numorp` com fallback.
(Vou inspecionar e corrigir os dois durante a build.)

### 2. `FilaSituacaoCard.tsx`
- Trocar leitura para `r.sitorp` (com `String(...).trim().toUpperCase()`).
- Chave única para deduplicação:
  ```ts
  const key = r.op_chave ?? `${r.codori}-${r.numorp}`;
  ```
- Mapa de labels conforme spec do usuário:
  ```ts
  const SIT_LABELS = {
    A: 'A — Aberta',
    L: 'L — Liberada',
    F: 'F — Finalizada',
    C: 'C — Cancelada/Encerrada',
    S: 'S — Suspensa',
    '': 'Sem situação',
  };
  ```
  Vazio/null cai em `'Sem situação'` (não em `'?'`).
- Continuar chamando `/detalhe` com `situacoes: undefined` (regra "exceto situação" já está correta — apenas o agrupamento estava errado).
- Subtitle: trocar para "Agrupado por `sitorp` · deduplicado por `op_chave`".

### 3. Apresentação dos números
O `DonutCard` já mostra contagem por fatia e total no centro. Para garantir o "percentual sobre o total" pedido, vou conferir se o tooltip do donut exibe `%`; se não, adicionar a porcentagem no `subtitle` de cada item via prop `data` (`{ name, value }` já entrega — o donut calcula % implicitamente nas fatias). Sem alteração de componente, só validar.

## Não vai mudar

- Endpoint usado (continua `/api/producao/carga/detalhe`).
- Regra "respeitar todos os filtros exceto situação" (já estava ok).
- Comportamento de `onSelect` no clique numa fatia (continua emitindo o código da situação).
- Aviso "amostra parcial" quando `total_registros > 5000` (continua válido — paginação atual).

## Arquivos a editar

- `src/lib/producao/cargaApi.ts` — renomear/adicionar campos em `CargaDetalheRow`.
- `src/components/producao/carga-dashboard/FilaSituacaoCard.tsx` — trocar campos lidos, novo mapa de labels, nova chave de dedup.
- `src/components/producao/carga/DetalheOpsTab.tsx` — se exibir `sitop`/`numop` em colunas, fazer fallback `sitorp ?? sitop` / `numorp ?? numop`.