## Objetivo

Padronizar os títulos das páginas do módulo RH e das seções/widgets, seguindo o padrão de "01 — Resumo Folha" como referência: numeração de dois dígitos, travessão longo `—`, nome curto e moderno, sem prefixo redundante "RH -".

## Diagnóstico

Hoje cada página usa um formato diferente:

| Rota | Título atual |
| --- | --- |
| `/rh/resumo-folha` | `01 — Resumo Folha` |
| `/rh/quadro-colaboradores` | `02 — Quadro de Colaboradores` |
| `/rh/contrato-experiencia` | `RH - 03 - Contrato de Experiência` |
| `/rh/programacao-ferias` | `RH - 04 - Programação de Férias` |
| `/rh/turnover` | `RH-05 — Rotatividade / Turnover` |
| `/rh/absenteismo` | `RH - 06 - Absenteísmo / Afastamentos` |
| `/rh/formularios` | `99 — Formulários` |

Faltam também subtítulos consistentes e alguns títulos de widgets/seções estão abreviados demais (`Sexo`, `Filial`, `Por Empresa`, `Drill dimensões`, etc.).

## Padrão proposto

Formato: `NN — Nome`  (dois dígitos + espaço + `—` + espaço + nome curto e claro).
Subtítulo: uma linha descritiva curta, orientada ao gestor.

### Títulos e subtítulos das páginas

| Rota | Título novo | Subtítulo |
| --- | --- | --- |
| `/rh/resumo-folha` | `01 — Resumo da Folha` | `Visão consolidada de proventos, descontos e custo total` |
| `/rh/quadro-colaboradores` | `02 — Quadro de Colaboradores` | `Headcount, perfil demográfico e distribuição por empresa` |
| `/rh/contrato-experiencia` | `03 — Contrato de Experiência` | `Vencimentos, renovações e demissões pós-experiência` |
| `/rh/programacao-ferias` | `04 — Programação de Férias` | `Limites, vencimentos e programações dos próximos 90 dias` |
| `/rh/turnover` | `05 — Turnover` | `Admissões, demissões e taxa de rotatividade` |
| `/rh/absenteismo` | `06 — Absenteísmo` | `Afastamentos, dias perdidos e taxa de absenteísmo` |
| `/rh/formularios` | `99 — Formulários` | `Registros complementares do módulo de RH` |
| `/rh` (index) | `Recursos Humanos` | `Painéis, indicadores e gestão de pessoas` |

### Títulos de widgets/seções

`src/lib/rh/widgetCatalogs.ts` — atualizar `title` em defaults e catálogo (usado pelo card e pela biblioteca BI):

Resumo da Folha:
- `KPIs — Folha` → `Indicadores da Folha`
- `Evolução mensal` → `Evolução Mensal do Custo`
- `Detalhamento mensal` → `Detalhamento Mensal`
- `Proventos + Vantagens` → `Proventos e Vantagens`
- `Descontos` → `Descontos`
- `Filial` → `Custo por Filial`
- `Tipos de Evento` → `Tipos de Evento`

Quadro de Colaboradores:
- `KPIs — Quadro` → `Indicadores do Quadro`
- `Histórico Nº Colaboradores` → `Histórico de Colaboradores`
- `Sexo` → `Distribuição por Sexo`
- `Situação` → `Situação / Afastamento`
- `Vínculo` → `Tipo de Vínculo`
- `Escolaridade` → `Escolaridade`
- `Faixa etária` → `Faixa Etária`
- `Faixa Etária × Sexo` → `Faixa Etária por Sexo`
- `Tempo de Casa × Sexo` → `Tempo de Casa por Sexo`
- `Tempo casa + Filial` → `Tempo de Casa por Filial`
- `Empresa` → `Distribuição por Empresa`
- `Drill dimensões` → `Análise Multidimensional`

Contrato de Experiência:
- `Qtde Contratos` → `Total de Contratos`
- `Vencidos Pendentes` → `Vencidos Pendentes`
- `Demitidos 30d Após` → `Demitidos até 30 Dias Após`
- `A Vencer 5 Dias` → `A Vencer em 5 Dias`
- `A Vencer 10 Dias` → `A Vencer em 10 Dias`
- `Vencimentos` → `Vencimentos de Contrato`

Programação de Férias:
- `KPIs — Férias` → `Indicadores de Férias`
- `Limite Férias` → `Limites de Férias`
- `Programação Próximos 90 Dias` → `Programação — Próximos 90 Dias`
- `1º Vencimento e Sem Programação` → `1º Vencimento sem Programação`
- `Sem Programação` → `Sem Programação`

Turnover:
- `KPIs — Turnover` → `Indicadores de Turnover`
- `Admissões x Demissões por Mês` → `Admissões vs. Demissões por Mês`
- `Série mensal` → `Evolução Mensal`
- `Motivos de Desligamento` → `Motivos de Desligamento`
- `Motivos` → `Motivos`
- `Por Empresa` → `Turnover por Empresa`

Absenteísmo:
- `KPIs — Absenteísmo` → `Indicadores de Absenteísmo`
- `Por Mês` → `Evolução Mensal`
- `Por Categoria` → `Por Categoria`
- `Por Empresa` → `Por Empresa`
- `Por Motivo` → `Principais Motivos`

Também atualizar os `<h2>` em `AbsenteismoPage.tsx`, `TurnoverPage.tsx` e `ContratoExperienciaPage.tsx` para bater com os novos títulos dos widgets equivalentes.

## Arquivos alterados

- `src/pages/rh/ResumoFolhaPage.tsx` — título + subtítulo.
- `src/pages/rh/QuadroColaboradoresPage.tsx` — título + subtítulo.
- `src/pages/rh/ContratoExperienciaPage.tsx` — título + subtítulo + `<h2>`.
- `src/pages/rh/ProgramacaoFeriasPage.tsx` — título + subtítulo.
- `src/pages/rh/TurnoverPage.tsx` — título + subtítulo + `<h2>`.
- `src/pages/rh/AbsenteismoPage.tsx` — título + subtítulo + `<h2>`.
- `src/pages/rh/FormulariosPage.tsx` — título + subtítulo.
- `src/pages/rh/RhIndexPage.tsx` — subtítulo do índice.
- `src/lib/rh/widgetCatalogs.ts` — títulos de defaults e catálogo (afeta cards e Biblioteca BI).

## Fora de escopo

- Não altera dados, endpoints, cores, layout dos grids, componentes visuais ou lógica.
- Não renomeia rotas nem `type`/`pageKey` internos (apenas strings exibidas).
- Não mexe nos títulos já salvos em `dashboard_widgets` de usuários existentes — o `title` do banco continua sendo respeitado. Os novos títulos aparecem apenas para quem ainda usa os defaults; usuários que já customizaram continuam com o próprio texto.

## Validação

- Abrir cada rota `/rh/*` e verificar o novo cabeçalho (título + subtítulo) e os títulos dos cards.
- Abrir "Editar layout" e o diálogo "Adicionar da Biblioteca BI" — os títulos do catálogo aparecem atualizados.
