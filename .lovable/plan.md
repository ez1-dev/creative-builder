## Objetivo
Revisar o menu lateral (`src/components/AppSidebar.tsx`) e incluir as telas registradas em `src/App.tsx` que hoje não têm entrada no menu, além de corrigir 2 links que caem em redirect.

## Telas com rota, mas sem entrada no menu

**Configurações**
- `/monitor-telas` — Monitor de Telas (IA)

**BI / Contabilidade** (subitens da DRE que só são acessados por link direto hoje)
- `/bi/contabilidade/dre/excecoes` — DRE — Exceções
- `/bi/contabilidade/dre/aprovacoes` — DRE — Aprovações
- `/bi/contabilidade/dre/parametrizacao` — DRE — Parametrização
- `/bi/contabilidade/dre/sincronizacao-depara` — DRE — Sincronização De/Para
- `/bi/contabilidade/dre/configuracao` — Configuração da DRE Gerencial
- `/bi/contabilidade/dre-dinamica` — DRE Dinâmica Gerencial
- `/bi/contabilidade/dre-dinamica/montador` — Montador da DRE Gerencial
- `/bi/financeiro/dre-configuravel` — BI Financeiro — DRE Configurável

**Operacional**
- `/manutencao-maquinas/tipos` — Tipos de Máquina
- `/passagens-aereas/relatorio-executivo` — Passagens — Relatório Executivo
- `/frota/relatorio-executivo` — Frota — Relatório Executivo
- `/manutencao-maquinas/relatorio-executivo` — Máquinas — Relatório Executivo

## Correções em links já existentes no menu
- "DRE Studio — Modelos" (`/contabilidade/dre-studio/modelos`) → trocar para `/contabilidade/dre-studio` (a rota atual é apenas um `Navigate` que redireciona).
- "DRE Studio — Novo Modelo" (`/contabilidade/dre-studio/modelos/novo`) → trocar para `/contabilidade/dre-studio/novo`.

## Não incluído
- `/bi-components-demo` (rota de demo/desenvolvedor; já existe "Biblioteca BI" em Configurações apontando para a mesma página).
- `/usuarios-conectados` (alias antigo do Monitor de Usuários Senior).
- Rotas paramétricas (`/regras-senior/regras/:id/...`, `/etl/tarefas/:nome`, subrotas de `/contabilidade/dre-studio/:id/...`) — são acessadas a partir das telas pai e não fazem sentido como item de menu fixo.

## Detalhes técnicos
- Editar somente `TOP_MENUS` em `src/components/AppSidebar.tsx`:
  - **ERP → BI e Analytics**: adicionar DRE Dinâmica, Montador, DRE Configurável e as 5 subrotas da DRE (Exceções, Aprovações, Parametrização, Sincronização De/Para, Configuração).
  - **ERP → Financeiro e Contábil**: ajustar os 2 links do DRE Studio para as rotas canônicas.
  - **ERP → Operacional**: adicionar Tipos de Máquina e os 3 "Relatório Executivo" (agrupados por módulo pai).
  - **Configurações**: adicionar Monitor de Telas.
- Os itens continuam sujeitos ao filtro `isVisible` (permissões / demo mode) — usuários sem permissão continuam sem enxergar.
- Nenhuma alteração de rota, permissão ou lógica de negócio.
