

# Drill-down nos KPIs de Status do Dashboard de Produção

## Dados disponíveis

O array `top_projetos_patio` já contém o campo `status_patio` por projeto, que indica o status de cada projeto (ex: "EM PRODUÇÃO", "EXPEDIÇÃO PARCIAL", "TOTALMENTE EXPEDIDO", "AGUARDANDO PRODUÇÃO", etc.).

## Implementação

### Arquivo: `src/pages/producao/ProducaoDashboardPage.tsx`

1. Criar helper `buildStatusDetails(projetos, statusFilter)` que filtra `top_projetos_patio` pelo `status_patio` correspondente e retorna `{ label, value }[]` com o nome do projeto e o cliente.

2. Mapear os status para cada KPI:
   - **Aguardando Prod.** → `status_patio` contendo "AGUARDANDO"
   - **Em Produção** → `status_patio` contendo "PRODUÇÃO" ou "SEM ENTRADA"
   - **Parcial Expedido** → `status_patio` contendo "PARCIAL"
   - **Total Expedidos** → `status_patio` contendo "TOTALMENTE EXPEDIDO"

3. Formato do drill-down: label = `"Proj {id} / Des {id} Rev {rev}"`, value = cliente (truncado a 25 chars). Top 15 projetos.

4. Adicionar tooltips descritivos nos 4 KPIs de status.

## Resultado esperado

Ao clicar em qualquer KPI de status, um popover lista os projetos naquele status com identificação e cliente.

