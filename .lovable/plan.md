## Ajustes no Relatório Executivo de Faturamento

Dois ajustes pontuais em `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx` (somente apresentação, sem mudar API/backend nem outros relatórios).

### 1. Ocultar "Top Obras/Projetos" quando Unidade = GENIUS

Em `RankingsBloco`, usar `filtros.unidade_negocio` (já presente em `BlocoProps`) para renderizar o card `Top Obras/Projetos` apenas quando a unidade **não** for `GENIUS`. Quando GENIUS, a grade fica com Revendas + Estados (2 colunas continuam fazendo sentido).

Justificativa: na unidade GENIUS o conceito de obra/projeto não se aplica como na Estrutural Zortea, então o ranking sempre vem vazio/irrelevante.

### 2. Mostrar primeiro nome do cliente no Pareto e na Tabela Analítica

Hoje a UI exibe apenas `Cliente {cd_cliente}` (ex.: `Cliente 8865`) porque os endpoints comerciais ainda não devolvem `nm_cliente`. Já existe o hook `useBiClientesMap` (lê `bi_cliente` no Cloud, com `nm_cliente` e `nm_fantasia`).

Ajustes:

- **`ParetoBloco`**: usar `useBiClientesMap()`. Em `formatLabel`, quando `dim === 'cliente'`, montar `${cd} - ${primeiroNome(nm_cliente ?? nm_fantasia)}`. Aplicar:
  - no eixo X do gráfico Pareto (top 20),
  - na lista "Principais (Poucos Vitais)",
  - no `buildParetoPayload` para exportação PPTX (mesma função de label).
- **`TabelaAnaliticaBloco`**: na coluna `Cliente`, exibir `${cd_cliente} — ${primeiroNome}` quando houver match no mapa; fallback para só o código.
- Helper local `primeiroNome(s)`: pega o primeiro token alfabético do nome (`"FULANO DA SILVA"` → `"Fulano"`), aplica Title Case simples. Se o mapa ainda estiver carregando ou o cliente não existir, mantém o comportamento atual (só código).

### Arquivos alterados

- `src/components/bi/relatorio-executivo/RelatorioBlocos.tsx` — adicionar import de `useBiClientesMap`, helper `primeiroNomeCliente`, condicional no `RankingsBloco`, e usar o nome nos labels do Pareto + Tabela Analítica.

### Fora de escopo

- Não alterar `useRelatorioExecutivoFaturamento`, endpoints, `comercialApi.ts`, nem outros relatórios/dashboards.
- Não mexer no PPTX além de o `buildParetoPayload` herdar o novo `formatLabel`.
- Outras dimensões do Pareto (revenda/estado/obra) seguem como estão.
