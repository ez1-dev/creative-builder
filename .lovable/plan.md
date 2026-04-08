

# Persistir filtros de Produção ao navegar entre páginas

## Problema
Cada página de produção mantém seus filtros em `useState` local. Quando o usuário navega para outra página do módulo (ex: de Expedido para Pátio), os filtros são perdidos porque o componente é desmontado.

## Solução
Criar um **contexto React** (`ProducaoFiltersContext`) que armazena os filtros compartilhados entre todas as páginas de produção. Os filtros comuns (projeto, desenho, revisão, cliente, cidade) ficam no contexto; filtros exclusivos de cada página (data_ini, data_fim, codigo_produto, numero_carga, codigo_barras) continuam locais.

## Alterações

### 1. Novo arquivo: `src/contexts/ProducaoFiltersContext.tsx`
- Context com estado para os filtros comuns: `numero_projeto`, `numero_desenho`, `revisao`, `cliente`, `cidade`
- Funções `setSharedFilters` e `clearSharedFilters`
- Provider que envolve as rotas de produção

### 2. `src/App.tsx`
- Envolver as rotas `/producao/*` com o `ProducaoFiltersProvider`

### 3. Páginas de produção (6 arquivos + EngenhariaProducaoPage)
- Consumir `useProducaoFilters()` para os campos comuns
- Mesclar com filtros locais (datas, código produto, carga, etc.) onde aplicável
- `clearFilters` limpa tanto o contexto quanto os locais
- `clearResults` continua limpando apenas dados/KPIs, sem tocar filtros

### Resultado
Ao preencher "Projeto: 663" em Expedido e navegar para Pátio, o campo Projeto já estará preenchido com "663".

