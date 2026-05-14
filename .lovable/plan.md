## Objetivo

Melhorar o dashboard de **Manutenção de Frota** mostrando a descrição do veículo junto com a placa e adicionando uma visão por tipo de veículo.

## O que muda

### 1. Gráfico "Top Veículos por Valor"
Hoje exibe apenas a placa (ex.: `RDV2H41`). Passa a exibir **placa + descrição**, ex.:

```
RDV2H41 — CAMINHÃO IVECO STRALIS         R$ 80.964,01
MIU8272 — VW DELIVERY                    R$ 58.179,27
EMPILHADEIRA                             R$ 15.145,00
```

Quando o veículo não tiver descrição cadastrada, mostra só a placa (comportamento atual). O clique continua filtrando pela placa.

### 2. Novo gráfico "Manutenções por Tipo de Veículo"
Gráfico de pizza/donut agregando o valor por `tipo_veiculo` (LEVE, CAMINHÃO, CARRETA, GUINDASTE, CAÇAMBA, MUCK, OUTRO). Clique cross-filtra o restante do dashboard pelo tipo selecionado, igual aos outros gráficos.

### 3. Coluna "Tipo" da tabela
Já existe — sem alteração.

## Detalhes técnicos

- Arquivo único: `src/components/frota/FrotaDashboard.tsx`.
- `topVeiculos`: passa a agrupar por `placa` mas trazer também a `veiculo_descricao` mais frequente daquela placa para compor o label `"<placa> — <descricao>"`.
- Novo `topTipos = topBy(crossFiltered, r => r.tipo_veiculo || 'NÃO INFORMADO')` + um `RankingChart`/`PieChart` (mesmo padrão dos demais cards do dashboard).
- Cross-filter: novo estado `selTipoVeiculo` integrado ao `crossFiltered` existente.
- Sem mudanças de schema, RPC, importador ou exportação.

## Fora do escopo

- Cadastro de tipo de veículo (já existe).
- Mudança no importador de planilha.
- Mudanças nas demais telas (Máquinas, Passagens).
