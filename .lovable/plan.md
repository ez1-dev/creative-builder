## Objetivo

Transformar a página existente `/monitor-telas` em uma tela com **duas abas** (Portal Web e ERP Nativo) que usam o **mesmo layout** e alternam apenas a base da API de telemetria, sem mock, sem inventar dados.

## Estrutura de arquivos

**Novo / editado:**

- `src/lib/format.ts` — garantir `formatDateBR`, `formatDateTimeBR`, `formatNumberBR` (reutilizar se existirem; caso contrário criar helpers seguros a timezone via `Intl.DateTimeFormat('pt-BR')`).
- `src/lib/navegacaoTelemetriaApi.ts` — generalizar: aceitar `basePath` (`/api/navegacao/telemetria` ou `/api/telemetria-nativa`) e endpoint de histórico configurável. Adicionar campos opcionais nos tipos: `sig_processo`, `telas_catalogo`, `fonte`, e para eventos nativos `nomusu`, `observacao`.
- `src/components/monitor-telas/MonitorTelasTab.tsx` (novo) — componente que recebe `{ origem: 'web' | 'nativo', basePath, historicoConfig, dias, modulo, usuario }` e renderiza cards + gráfico + ranking + tabela "sem uso" + modal de drill. Extrai a lógica hoje em `MonitorTelasPage.tsx`.
- `src/components/monitor-telas/HistoricoTelaModal.tsx` — aceitar `origem` para escolher endpoint e conjunto de colunas:
  - Portal Web → `GET /api/navegacao/historico?cod_tela=&incluir_heartbeat=false&tamanho_pagina=200` (payload `dados[]`, colunas Data/Hora, Usuário, Ação, Módulo, Sistema).
  - ERP Nativo → `GET /api/telemetria-nativa/eventos?cod_tela=&dias=&limit=200` (payload `dados[]`, colunas Data/Hora, Usuário `nomusu`, Ação, Módulo, Observação).
- `src/pages/MonitorTelasPage.tsx` — vira shell: título/subtítulo, filtros globais (dias 7/30/60/90, modulo, usuario_filtro, botão Atualizar) e `Tabs` com `MonitorTelasTab` para cada origem. Os filtros aplicam à aba ativa; trocar de aba força reload.

## Comportamento por aba

Cada aba faz em paralelo:

- `GET {base}/resumo`
- `GET {base}/ranking?limit=100`
- `GET {base}/por-dia`
- `GET {base}/nao-utilizadas`

Enviando sempre `dias`, `modulo`, `usuario_filtro` quando preenchidos. `Authorization: Bearer` já é injetado pelo `api.ts` atual (mantido).

### Cards (resumo)

1. Total de Acessos — `total_acessos`.
2. Telas Usadas — `telas_usadas / telas_catalogo` (se `telas_catalogo` vier nulo, mostra só `telas_usadas`).
3. Telas Sem Uso — `telas_sem_uso`, laranja quando > 0.
4. Usuários Ativos — `usuarios_ativos` com subtítulo "Último acesso: …" ou "Sem acesso no período." quando `ultimo_acesso` é nulo.

### Gráfico "Acessos por Dia"

`ComposedChart` mantido: barra `acessos`, linha `telas` (opcional). Formatar eixo X com `formatDateBR`.

### Ranking

Colunas conforme spec. Ordenação padrão `acessos desc`. Barra proporcional ao maior `acessos` da lista. Para **ERP Nativo**: se `cod_tela` vazio usar `sig_processo` como identificador; se `nome_tela` vazio, exibir `"Processo " + sig_processo`. Clique na linha abre `HistoricoTelaModal` passando `origem` e o identificador correto.

### Telas Sem Uso

Colunas conforme spec. Regras visuais:

- `dias_sem_uso > 30` → badge vermelho.
- `dias_sem_uso` entre 15 e 30 → badge laranja.
- `ultimo_acesso` nulo → "Nunca acessada".
- `total_historico === 0` → badge "Nunca usada".

### Validação de `fonte`

Ao receber payloads de resumo/ranking, se vier `fonte`:

- Aba **Portal Web** aceita `ERP_WEB`, `PORTAL_WEB`, `NAVEGACAO_WEB`.
- Aba **ERP Nativo** aceita apenas `ERP_SENIOR_NATIVO`. Se vier `ERP_WEB`, bloquear a renderização dos dados dessa aba e mostrar alerta: *"Fonte incorreta: estes dados são do Portal Web, não do ERP Senior Nativo."*

### Estados

- Loading: skeletons nos cards, gráfico e tabelas.
- Erro genérico: "Não foi possível carregar a telemetria de telas."
- 401 → "Sessão expirada. Faça login novamente."
- 404 → "Endpoint de telemetria ainda não disponível. Verifique se a API 8070 foi reiniciada."
- Vazio (todas as coleções sem itens e resumo zerado):
  - Portal Web → "Sem dados no período selecionado."
  - ERP Nativo → "A telemetria nativa depende da regra GER-000CONCX01 no Senior. Nenhum evento nativo foi registrado ainda."

Detecção de status HTTP: usar `error.statusCode` já exposto pelo `api.ts`.

## Filtros globais vs. por aba

Os filtros ficam no shell da página. Alterar filtro **não** dispara reload automático (evita chamadas duplicadas ao digitar): reload ocorre no clique em **Atualizar** ou ao trocar de aba, replicando o comportamento atual.

## Fora de escopo

- Nenhuma alteração em outras páginas, sidebar ou rotas (item já está no menu).
- Sem mock, sem dados sintéticos, sem catálogo próprio de telas no front.
- Sem mudanças em `UserTrackingProvider` ou `navegacaoLogger`.

## Critérios de aceite

Cobrem os 12 itens listados: rota abre, duas abas, cada uma consome sua base, filtros propagados, cards/gráfico/ranking/sem-uso carregam de seus endpoints, drill correto por aba, sem mock, aba nativa suporta payload vazio, mensagens claras para 404/regra nativa ausente.
