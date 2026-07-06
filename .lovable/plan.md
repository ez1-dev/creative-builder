## Objetivo
Restaurar os dados na página **RH-04 - Programação de Férias**, mantendo a barra de filtros e o grid editável introduzidos na refatoração recente.

## Causa raiz
`filtrarFeriasPorPeriodo` é aplicado sobre `dt_limite_saida`, com range default `AAAA01–(AAAA+1)12`. Como VENCIDAS têm limite no passado (e vários períodos ativos têm limites fora da janela do ano corrente), quase todo o `detalhe`, o `pivot` e as tabelas ficam vazios, e os KPIs zerados.

## Correções

1. **`src/pages/rh/ProgramacaoFeriasPage.tsx`**
   - Trocar o estado inicial de filtros para **vazio** (`ini=""`, `fim=""`) → mostra todos os períodos ao abrir a página, como era antes.
   - Manter `RhFiltrosBar` funcional: o usuário ainda pode preencher um período para restringir.

2. **`src/components/rh/RhFiltrosBar.tsx`** (verificar)
   - Confirmar que aceita `ini/fim` vazios sem forçar preenchimento (se estiver forçando, permitir string vazia e um botão "Limpar período").

3. **`src/lib/rh/filtros.ts`**
   - `filtrarFeriasPorPeriodo` já retorna o dashboard inalterado quando `!ini && !fim` — nenhum ajuste necessário aqui.

4. **Bônus — warning `duplicate key .$drill-card`** em `QuadroColaboradoresPage`
   - Já visto nos logs do console (react-grid-layout reclamando de key duplicada). Investigar o `RhDashboardGrid` para garantir que não renderize dois filhos com o mesmo `key` quando um widget está oculto/mostrado, e corrigir. Não afeta dados, mas limpa o warning na mesma pass.

## Fora de escopo
- Não mexer no fetch (`fetchProgramacaoFeriasDashboard`) nem no backend.
- Não alterar o comportamento do filtro em outras páginas RH (Contratos, Turnover, Absenteísmo, Quadro, Resumo Folha) — para Contratos, o range anual continua fazendo sentido.

## Validação
- Abrir `/rh/programacao-ferias`: KPIs preenchidos, pivot "Limite Férias" com linhas, tabelas "Próximos 90 dias" e "Sem programação" com dados.
- Aplicar período `202601–202612` na barra e ver o filtro reduzir os números; limpar volta ao total.
- Console sem o warning de `drill-card` duplicado ao trocar de página.
