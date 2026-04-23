

## Dashboard de Uso & Engajamento de Usuários

### Objetivo
Criar uma nova aba "Dashboard de Uso" dentro de **Configurações** (admin-only) com visão analítica de **horas de uso, engajamento, módulos mais acessados e padrões de comportamento**, complementando o atual "Monitoramento" (que mostra só online/histórico bruto).

### Diagnóstico
- Já existe `user_activity` (eventos `page_view` / `action`) e `user_sessions` (heartbeat de 60s).
- `MonitoramentoUsuarios.tsx` já mostra online + tabela. Falta visão **agregada e gráfica**.
- Retenção atual: 7 dias para `user_activity`. Suficiente para análises semanais.
- O heartbeat permite **estimar tempo de uso**: cada 2 `page_view`/heartbeats consecutivos do mesmo usuário em janela de 5min = 1 sessão; somando o tempo entre eventos (capado em 5min de ociosidade) → horas de uso.

### Métricas que o dashboard vai mostrar

**KPIs topo (período selecionável: 24h / 7d):**
1. **Usuários ativos únicos** (DAU/WAU)
2. **Total de horas de uso estimadas**
3. **Sessões realizadas** (gap >5min = nova sessão)
4. **Tempo médio por sessão** (min)
5. **Páginas/sessão** (engajamento)
6. **Ações executadas** (cliques em export, IA, filtros, etc.)

**Gráficos (recharts, já no projeto):**
1. **Horas de uso por usuário** — bar chart horizontal (top 15)
2. **Atividade por hora do dia** — line chart 0–23h (heatmap-like, mostra horários de pico)
3. **Atividade por dia da semana** — bar chart (7d)
4. **Módulos mais utilizados** — donut/pie (agrupar `path` por raiz: `/estoque`, `/contas-pagar`, `/producao/*`, etc.)
5. **Linha do tempo de acessos** — line chart por dia (últimos 7d)
6. **Engajamento por usuário** — tabela com: usuário, sessões, horas, páginas, ações, última atividade, módulo favorito

**Insights automáticos (cards):**
- Usuário mais ativo da semana
- Módulo mais usado da empresa
- Horário de pico de uso
- Usuários inativos há >3 dias (alerta)
- Total de exportações Excel (proxy de "consumo de relatórios")

### Como calcular "horas de uso" (algoritmo)
```text
1. Ordenar eventos do usuário por timestamp.
2. Para cada par consecutivo (e1, e2):
   gap = e2.created_at - e1.created_at
   se gap <= 5min  → soma gap ao tempo de uso
   se gap >  5min  → ignora (usuário ficou ocioso ou saiu)
3. Soma final = horas de uso estimadas no período.
4. Sessão = bloco contínuo onde nenhum gap > 5min.
```
Cálculo client-side em memória sobre o resultado da query (até 5000 linhas/período).

### Estrutura de arquivos

**Novo:**
- `src/components/erp/DashboardUsoUsuarios.tsx` — dashboard completo (KPIs + 6 gráficos + tabela de engajamento + insights).
- `src/lib/userUsageMetrics.ts` — funções puras: `estimateSessions()`, `aggregateByHour()`, `aggregateByModule()`, `topUsersByHours()` (testáveis).

**Alterado:**
- `src/pages/ConfiguracoesPage.tsx` — adicionar nova aba **"Dashboard de Uso"** ao lado de "Monitoramento" (admin only, mesmo guard).
- `src/hooks/useAiPageContext.ts` — registrar contexto da nova aba (`title`, KPIs, top usuário) para o assistente IA conseguir responder perguntas tipo "quem usou mais essa semana?".

### Layout (1777px viewport)

```text
┌─────────────────────────────────────────────────────────────┐
│ Período: [24h ▾] [7d ▾]   [Atualizar]                       │
├─────────────────────────────────────────────────────────────┤
│ KPI │ KPI │ KPI │ KPI │ KPI │ KPI    (6 cards em linha)     │
├─────────────────────────────────────────────────────────────┤
│ Horas por usuário (bar)    │ Módulos mais usados (donut)   │
├─────────────────────────────┼───────────────────────────────┤
│ Atividade por hora (line)  │ Atividade por dia sem (bar)   │
├─────────────────────────────┴───────────────────────────────┤
│ Linha do tempo — acessos por dia (line, full width)         │
├─────────────────────────────────────────────────────────────┤
│ Insights: 3 cards com destaque automático                   │
├─────────────────────────────────────────────────────────────┤
│ Tabela: Engajamento por usuário (sortable)                  │
└─────────────────────────────────────────────────────────────┘
```

### Filtros do dashboard
- **Período**: 24h, 7d (limite atual de retenção)
- **Usuário**: dropdown (filtra todos os charts)
- **Módulo**: dropdown (filtra para drill-down)
- **Exportar Excel**: botão para baixar o engajamento da tabela

### Acesso & Segurança
- Aba visível apenas para admins (mesma checagem `is_admin` já usada em "Monitoramento").
- Usa as RLS existentes — admin lê `user_activity` e `user_sessions`.
- Sem novas tabelas; sem migrations.

### Fora de escopo (futuro)
- Retenção >7 dias (exigiria mudar `cleanup_old_user_activity` + custos de armazenamento).
- Tracking granular de tempo em foco da aba (Page Visibility API) — hoje o heartbeat de 60s é suficiente.
- Comparativo período vs período anterior.
- Export PDF do dashboard.

### Resultado
Admin abre **Configurações → Dashboard de Uso** e vê instantaneamente: quem usa mais o sistema (horas), quais módulos são prioridade, horários de pico, usuários inativos e engajamento individual — tudo com gráficos interativos e exportável.

