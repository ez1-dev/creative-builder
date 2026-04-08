

# Corrigir Nomes de Campos para Usar os Nomes Reais da API

## Problema
Na mudanca anterior, renomeamos os campos do frontend para alinhar com a query SQL. Porem, a API backend retorna os dados com nomes **diferentes** dos aliases SQL. O frontend agora referencia campos que nao existem na resposta, causando dados em branco.

## Evidencia (response body real capturado nos network requests)

### Dashboard (`/api/producao/dashboard`)
- `resumo.kg_engenharia` (nao `kg_previsto_projeto`)
- `top_projetos_patio[].cliente` (nao `nome_cliente`)
- `top_projetos_patio[].kg_engenharia` (nao `kg_previsto_projeto`)
- `top_projetos_patio[].status_patio` (nao `status_geral`)
- `top_projetos_patio[].perc_expedido` (nao `perc_expedido_sobre_previsto`)

### Produzido (`/api/producao/produzido`)
- `cliente` (nao `nome_cliente`) - funciona pois esta pagina nao foi alterada nas colunas

### Expedido (`/api/producao/expedido`)
- `cliente` (nao `nome_cliente`) - idem

## Solucao
Reverter os nomes dos campos no frontend para usar exatamente os nomes que a API retorna. Manter os status values atualizados apenas quando houver confirmacao de que a API os retorna (ex: `status_patio` no patio usa valores como "TOTALMENTE EXPEDIDO", "SEM PRODUCAO").

### Correcoes por arquivo:

**1. `src/pages/producao/ProducaoDashboardPage.tsx`**
- Interface `DashboardResumo`: `kg_previsto_projeto` → `kg_engenharia`
- Interface `TopProjetoPatio`: `kg_previsto_projeto` → `kg_engenharia`, `nome_cliente` → `cliente`, `status_geral` → `status_patio`
- KPI "Kg Previsto": usar `resumo.kg_engenharia`

**2. `src/pages/EngenhariaProducaoPage.tsx`**
- Sem dados reais capturados para este endpoint. Usar nomes conservadores baseados no padrao da API:
  - `nome_cliente` → `cliente`
  - `kg_previsto_projeto` → `kg_engenharia`
  - `kg_fabricado_cadastro` → `kg_estrutura`
  - `status_geral` → `status_fluxo`
  - `perc_produzido_sobre_previsto` → `perc_atendimento_producao`
  - `perc_expedido_sobre_previsto` → `perc_expedido`
  - `data_primeira_entrada_estoque` → `primeira_producao`
  - `data_primeira_expedicao` → `primeira_expedicao`
  - `qtd_cargas` → manter se a API retorna, senao remover
- StatusColor: adicionar ambos os valores (antigos e novos) para robustez

**3. `src/pages/producao/SaldoPatioPage.tsx`**
- `nome_cliente` → `cliente`
- `kg_previsto_projeto` → `kg_engenharia`
- `status_geral` → `status_patio`
- `perc_produzido_sobre_previsto` → `perc_atendimento_producao`
- `perc_expedido_sobre_previsto` → `perc_expedido`
- `perc_expedido_sobre_produzido` → remover (nao confirmado na API)
- StatusColor: suportar ambos os conjuntos de valores

**4. `src/pages/producao/LeadTimeProducaoPage.tsx`**
- `nome_cliente` → `cliente`
- `data_primeira_entrada_estoque` → manter (ja existia antes como `data_primeira_entrada_estoque`)
- `dias_liberacao_ate_producao` → `dias_liberacao_ate_producao` (verificar se API usa este nome)
- `status_geral` → `status_fluxo` ou manter dual
- StatusColor: suportar ambos

### Estrategia de StatusColor resiliente
Em todos os `statusColor`, suportar AMBOS os conjuntos de valores para garantir que funcione independente do formato retornado:
```
case 'TOTALMENTE EXPEDIDO':
case 'EXPEDIDO':
  return '...success...'
case 'EXPEDIÇÃO PARCIAL':
case 'PARCIALMENTE EXPEDIDO':
  return '...warning...'
```

## Arquivos afetados
- `src/pages/producao/ProducaoDashboardPage.tsx`
- `src/pages/EngenhariaProducaoPage.tsx`
- `src/pages/producao/SaldoPatioPage.tsx`
- `src/pages/producao/LeadTimeProducaoPage.tsx`

