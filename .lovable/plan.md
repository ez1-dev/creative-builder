

# Correção de mapeamento de campos entre Frontend e API de Produção

## Diagnóstico

Após analisar o código backend (`ajustado.txt`) e todas as páginas do frontend, identifiquei as seguintes divergências:

### 1. LeadTimeProducaoPage — 3 colunas com nomes errados

| Frontend (column key) | API retorna | Resultado |
|---|---|---|
| `data_primeira_entrada_estoque` | `primeira_producao` | Coluna vazia |
| `data_primeira_expedicao` | `primeira_expedicao` | OK |
| `dias_liberacao_ate_producao` | `dias_engenharia_ate_producao` | Coluna vazia |
| `dias_total_liberacao_ate_expedicao` | `dias_total_ate_expedicao` | Coluna vazia |

### 2. Produzido no Período — KPIs corretos agora

A API agora retorna `resumo` com `quantidade_produzida`, `peso_real`, `quantidade_etiquetas`. O frontend já consome esses campos corretamente (linhas 68-72). **Problema anterior resolvido no backend.**

Porém, o `resumo.peso_real` soma `SUM(base.peso_real)` onde `base.peso_real = REE.USU_PESREA`. Como cada etiqueta (ETQ) tem uma linha e a junção é ETQ→REE por `ITEREE`, se um REE tiver múltiplas ETQs, o peso será somado múltiplas vezes. Mas isso é o comportamento correto para esta granularidade (peso por etiqueta).

### 3. Expedido para Obra — KPIs corretos agora

A API retorna `resumo` com `quantidade_expedida`, `peso_real`, `quantidade_cargas`. O frontend mapeia:
- `resumo.quantidade_expedida` → OK (linha 70 do ExpedidoObraPage usa fallback `qtd_expedida`, mas `quantidade_expedida` existe)
- `resumo.peso_real` → OK (linha 71)
- `resumo.quantidade_cargas` → **Problema**: o frontend procura `resumo.cargas_distintas` (linha 74) mas a API retorna `resumo.quantidade_cargas`

### 4. Saldo em Pátio — Sem resumo na API

A API usa `executar_paginado_sem_count` que não inclui `resumo`. O frontend faz fallback para consolidação client-side. **Funciona, mas é lento para muitas páginas.**

### 5. Engenharia x Produção — 1 coluna inexistente

A coluna `qtd_cargas` não é retornada pela API `/api/producao/engenharia-x-producao`. Essa coluna ficará sempre vazia.

### 6. Dashboard — Compatível

Os campos do `resumo` e `top_projetos_patio` estão alinhados entre API e frontend. O `top_projetos_patio` retorna `status_fluxo` em vez de `status_patio` mas os charts não usam esse campo, então não há impacto visual.

## Plano de implementação

### Arquivo 1: `src/pages/producao/LeadTimeProducaoPage.tsx`
Corrigir 3 column keys:
- `data_primeira_entrada_estoque` → `primeira_producao`
- `dias_liberacao_ate_producao` → `dias_engenharia_ate_producao`
- `dias_total_liberacao_ate_expedicao` → `dias_total_ate_expedicao`

### Arquivo 2: `src/pages/producao/ExpedidoObraPage.tsx`
Na função `consolidateKpis`, corrigir o mapeamento do resumo:
- `resumo.cargas_distintas` → adicionar fallback para `resumo.quantidade_cargas`

### Arquivo 3: `src/pages/EngenhariaProducaoPage.tsx`
Remover ou comentar a coluna `qtd_cargas` que não existe na API, ou deixar com valor vazio aceitável.

## Resultado esperado

- **Lead Time**: as 3 colunas que estavam vazias (1ª Produção, Dias Eng→Prod, Dias Total) passarão a exibir dados.
- **Expedido para Obra**: o KPI "Cargas Distintas" mostrará o valor correto do resumo.
- **Engenharia x Produção**: coluna "Cargas" não mostrará dados (API não retorna), mas ficará documentada.
- **Produzido** e **Dashboard**: sem alterações necessárias, já estão compatíveis.

