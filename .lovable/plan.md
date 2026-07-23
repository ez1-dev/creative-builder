# Refino da tela Kardex (ficha de estoque)

A tela `/contabilidade/kardex` já implementa a maior parte do contrato descrito no prompt (autocomplete de componente, período, filtros opcionais, cabeçalho com conta contábil, cards de saldos/entradas/saídas, giro, tabela com sinal e cores por tipo, conferência e exportação Excel via fetch+blob). Os ajustes abaixo alinham o restante do payload validado em 23/07/2026.

## Alterações

### 1. Tipos (`src/lib/contabil/kardexApi.ts`)
- Estender `KardexProduto` com `origem?: string` e `familia?: string` (backend passou a devolver esses campos junto do produto).

### 2. Cabeçalho do produto (`KardexPage.tsx`)
- Após "Descrição" e "Unidade", exibir dois novos mini-campos quando presentes:
  - **Origem** (`produto.origem`)
  - **Família** (`produto.familia`)
- Manter conta contábil, total de movimentos, transferências e giro como já estão.

### 3. Card de Transferências
- Hoje o bloco de transferências só aparece quando `transferencias_qtd > 0`. Alterar para exibir quando **qtd ou valor** forem diferentes de zero (transferência pode ter apenas valor, sem quantidade — mesmo padrão da regra de sinal do `ESTEOS`).

### 4. Conferência (selo)
- Incluir transferências no cálculo, conforme fórmula oficial:
  - `esperadoQtd = saldo_inicial + entradas − saídas + transferencias_qtd`
  - Renderizar o texto com `± transferências` quando `transferencias_qtd !== 0`.
- Manter tolerância de 0,001; o selo continua verde/âmbar.

### 5. Nada mais muda
- Autocomplete via `/api/requisicoes/lookup/componentes`: já ok.
- Exportação Excel via `fetch` + blob com `Authorization`: já ok.
- Tabela: colunas, sinal, cores (entrada verde / saída vermelha / transferência azul) e ordenação por data: já ok.
- Rota, permissões (`CONT_KARDEX`) e integração com Conciliação Estoque × Contábil: já registradas em turnos anteriores.

## Detalhes técnicos

- Único arquivo de lógica alterado: `src/lib/contabil/kardexApi.ts` (2 campos opcionais em `KardexProduto`).
- Único arquivo de UI alterado: `src/pages/contabilidade/KardexPage.tsx` (cabeçalho + `conferencia` no `useMemo` + condição do card de transferências).
- Sem mudanças em rotas, menu, tipos globais ou backend.
