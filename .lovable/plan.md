## Objetivo
Criar página `/monitor-telas` (Monitor de Telas) consumindo os 5 endpoints reais de telemetria da API FastAPI (`/api/navegacao/telemetria/*` e `/api/navegacao/historico`). Sem mock, sem HEARTBEAT, sem catálogo de "telas nunca acessadas" nesta versão.

## Arquivos

**Novos**
- `src/lib/navegacaoTelemetriaApi.ts` — tipos + wrappers `api.get(...)` para: `resumo`, `ranking`, `porDia`, `naoUtilizadas`, `historico`. Todos aceitam `{ dias, modulo?, usuario_filtro? }`; historico aceita `{ cod_tela, data_ini, data_fim, incluir_heartbeat:false }`.
- `src/pages/MonitorTelasPage.tsx` — página completa.
- `src/components/monitor-telas/HistoricoTelaModal.tsx` — dialog do drill.

**Editados**
- `src/App.tsx` — importar `MonitorTelasPage` e adicionar rota `/monitor-telas` dentro de `ProtectedRoute` (padrão das demais).
- `src/components/AppSidebar.tsx` — adicionar item **Monitor de Telas** (`Activity` icon) no grupo **Administração**, próximo ao "Monitor Usuários Senior".

## Layout da página

**Header**: título "Monitor de Telas" + subtítulo "Telemetria de uso das telas do ERP Web — ranking, frequência e telas sem uso."

**Barra de filtros** (Card):
- `dias`: Select 7/30/60/90 (default 30)
- `modulo`: Input opcional
- `usuario_filtro`: Input opcional
- Botão **Atualizar** (dispara refetch de todos os blocos)

**5 KPI Cards** (de `/resumo`): Total de Acessos, Telas Usadas, Telas Sem Uso (destaque laranja/vermelho), Usuários Ativos, Último Acesso (formatado pt-BR).

**Gráfico "Acessos por Dia"** (`/por-dia`) — usar `recharts` (já no projeto): eixo X `dia`, barras `acessos`, linha secundária opcional `telas`.

**Tabela "Ranking de Telas Mais Usadas"** (`/ranking?limit=100`):
Colunas Cód. Tela · Nome · Módulo · Acessos (com mini-barra proporcional ao maior) · Usuários · Primeiro Acesso · Último Acesso. Ordenação `acessos desc`. Linha clicável → abre `HistoricoTelaModal`.

**Tabela "Telas Sem Uso no Período"** (`/nao-utilizadas`):
Colunas Cód. Tela · Nome · Módulo · Último Acesso (ou "Nunca acessada" se null) · Dias Sem Uso (badge vermelho >30, laranja 15–30) · Total Histórico.

**Modal Histórico da Tela**:
Chama `/api/navegacao/historico?cod_tela=...&data_ini=...&data_fim=...&incluir_heartbeat=false`.
`data_ini` = hoje − `dias`; `data_fim` = hoje. Colunas: Data/Hora · Usuário · Ação · Módulo · Sistema.

## Estados
- **Loading**: skeletons em cards/gráfico/tabelas.
- **Vazio**: "Nenhum acesso encontrado para os filtros selecionados."
- **Erro genérico**: alert "Não foi possível carregar a telemetria de telas."
- **404 / API offline**: detectar via `error.status === 404` ou falha de rede → alert amigável "API indisponível. Verifique se a porta 8070 foi reiniciada." (endpoints são novos e só respondem após restart da API 8070).

## Regras
- Autenticação via `api.get` (já injeta `Bearer` e header ngrok).
- Zero mock, zero cálculo paralelo — apenas renderiza o que a API entrega.
- HEARTBEAT / FECHOU_TELA nunca são contados (backend já filtra).
- Reutilizar `formatDate`/`formatNumber` de `src/lib/format.ts`; adicionar `formatDateTimeBR` se não existir.
- Nesta v1 **não** implementar "telas nunca acessadas" (exigiria catálogo completo separado — fica para v2 com tabela-catálogo).

## Fora de escopo
Catálogo de telas, edição de logs, alterações no backend, mudanças em `UserTrackingProvider` ou em `MonitorNavegacaoSection`.
