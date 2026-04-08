

# Aplicar Consolidacao de KPIs em Expedido para Obra e Saldo em Patio

## Diagnostico

Verifiquei todas as paginas paginadas do modulo Producao:

| Pagina | Tem KPIs? | Soma apenas pagina atual? | Precisa corrigir? |
|--------|-----------|--------------------------|-------------------|
| Produzido no Periodo | Sim | Ja corrigido (consolidacao) | Nao |
| **Expedido para Obra** | Sim | **Sim** - `dados.reduce(...)` | **Sim** |
| **Saldo em Patio** | Sim | **Sim** - `dados.reduce(...)` | **Sim** |
| Nao Carregados | Nao tem KPIs | N/A | Nao |
| Lead Time | Nao tem KPIs | N/A | Nao |
| Engenharia x Producao | Nao tem KPIs | N/A | Nao |

As paginas **Expedido para Obra** e **Saldo em Patio** sofrem do mesmo problema: KPIs somam apenas os ~100 registros da pagina atual em vez do total geral do filtro.

## Solucao

Aplicar o mesmo padrao de consolidacao ja implementado em `ProduzidoPeriodoPage.tsx`:

### 1. `ExpedidoObraPage.tsx`
- Adicionar estados `kpiTotals` e `kpiLoading`
- Criar funcao `consolidateKpis` que:
  - Prioridade 1: usa `resumo` da API se disponivel
  - Prioridade 2: busca paginas restantes em background (batches de 5)
- Campos agregados: `quantidade_expedida`, `peso_real`, cargas distintas (`numero_carga`)
- KPIs mostram "Calculando..." durante consolidacao e "Total geral do filtro" ao concluir
- Usar `consolidationIdRef` para proteger contra race conditions
- Total Registros usa `data.total_registros` da API

### 2. `SaldoPatioPage.tsx`
- Mesma estrutura de consolidacao
- Campos agregados: `kg_produzido`, `kg_expedido`, `kg_patio`
- Endpoint: `/api/producao/patio`

## Arquivos afetados
- `src/pages/producao/ExpedidoObraPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`

