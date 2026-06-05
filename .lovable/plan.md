# Completar Permissões por Tela em Configurações

## Problema
A lista `ALL_SCREENS` em `src/pages/ConfiguracoesPage.tsx` está defasada em relação às rotas reais registradas em `src/App.tsx`. Várias telas — em especial os módulos **BI**, **Produção (Carga/Programação)**, **Cadastros**, **ETL**, **Regras Senior** e **Relatórios** — não aparecem na aba "Permissões por Tela", impedindo que perfis sejam configurados para elas.

## Telas que serão adicionadas

**BI**
- `/bi/faturamento-validacao` — BI — Validação de Faturamento
- `/bi/comercial` — BI Comercial
- `/bi/comercial/metas` — BI Comercial — Metas de Faturamento

**Produção (faltantes)**
- `/producao/carga` — Produção — Carga de Produção
- `/producao/carga/dashboard` — Produção — Carga (Dashboard BI)
- `/producao/carga/recursos` — Produção — Carga por Centro de Recurso
- `/producao/programacao` — Produção — Programação e Sequenciamento

**Cadastros**
- `/cadastros/produtos` — Cadastros — Consulta de Produtos

**Administração / Ferramentas**
- `/etl` — ETL / Camada Analítica

**Regras Senior**
- `/regras-senior` — Regras Senior — Dashboard
- `/regras-senior/regras` — Regras Senior — Lista de Regras
- `/regras-senior/identificadores` — Regras Senior — Identificadores
- `/regras-senior/auditoria` — Regras Senior — Auditoria
- `/regras-senior/snapshots` — Regras Senior — Snapshots

**Relatórios**
- `/relatorios/desenvolvimento` — Relatórios — Desenvolvimento
- `/relatorios/publicados` — Relatórios — Publicados
- `/relatorios/execucoes` — Relatórios — Histórico de Execuções

## Mudanças técnicas

1. **`src/pages/ConfiguracoesPage.tsx`** — acrescentar as entradas acima ao array `ALL_SCREENS` (mantendo nomes consistentes com `src/lib/screenCatalog.ts`).

2. **`src/components/configuracoes/PermissoesPorTelaPanel.tsx`** — atualizar a função `getModule()` para classificar as novas rotas nos grupos corretos:
   - `bi` (novo módulo) ou agrupar BI dentro de `faturamento`/`administracao`: criar novo grupo **"BI / Analytics"** (chave `bi`) cobrindo `/bi/*` e `/etl`.
   - `producao` já cobre `/producao/*` (ok).
   - novo grupo **"Cadastros"** (chave `cadastros`) para `/cadastros/*`.
   - novo grupo **"Regras Senior"** (chave `regras_senior`) para `/regras-senior*`.
   - novo grupo **"Relatórios"** (chave `relatorios`) para `/relatorios/*`.
   - Atualizar `MODULE_LABEL` e `MODULE_ORDER` com as novas chaves, mantendo `outras` como fallback.

## Fora de escopo
- Não cria/modifica políticas no Cloud (`profile_screens` já aceita qualquer `screen_path`).
- Não altera permissões já gravadas — apenas torna as telas configuráveis.
- Não mexe em `screenCatalog.ts` nem em `visualCatalog.ts`.