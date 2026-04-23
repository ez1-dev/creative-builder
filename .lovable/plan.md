

## Painel de Monitoramento de Usuários

### Visão geral
Nova aba **"Monitoramento"** em `/configuracoes` (visível só para admin) com 3 sub-seções:
1. **Online agora** — usuários ativos nos últimos 2 minutos
2. **Histórico de navegação** — páginas acessadas (últimos 7 dias)
3. **Ações realizadas** — eventos (export, edit, delete, login) (últimos 7 dias)

Retenção: 7 dias, limpeza automática semanal (igual aos logs de erro).

---

### Mudança 1 — Migração (schema + RLS + função de limpeza)

**Tabela `user_sessions`** (presença online — uma linha por usuário, atualizada via heartbeat):
```sql
CREATE TABLE public.user_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  display_name text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  current_path text,
  user_agent text
);
```

**Tabela `user_activity`** (histórico de navegação + ações):
```sql
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  event_type text NOT NULL,         -- 'page_view' | 'action'
  path text,                         -- '/contas-pagar', '/sugestao-min-max'...
  action text,                       -- 'export', 'edit', 'delete', 'login'... (null em page_view)
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_activity_user_created ON public.user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_created ON public.user_activity(created_at DESC);
```

**RLS:**
- `user_sessions`: usuário pode UPSERT a sua própria linha; admin pode SELECT tudo.
- `user_activity`: usuário pode INSERT a sua própria atividade; admin pode SELECT tudo. Admin pode DELETE.

**Função de limpeza** (reaproveita o cron já agendado, criando novo job):
```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_user_activity()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.user_activity WHERE created_at < now() - interval '7 days';
  DELETE FROM public.user_sessions WHERE last_seen_at < now() - interval '1 day';
$$;
```

### Mudança 2 — Agendar cron (insert tool)
```sql
SELECT cron.schedule(
  'cleanup-user-activity-weekly',
  '15 3 * * 1',  -- segunda 03:15 (15 min após o cleanup de logs)
  $$ SELECT public.cleanup_old_user_activity(); $$
);
```

---

### Mudança 3 — Tracking no frontend

**Novo arquivo `src/lib/userTracking.ts`** com:
- `trackPageView(path)` — INSERT em `user_activity` (event_type='page_view') + UPSERT em `user_sessions`
- `trackAction(action, details?)` — INSERT em `user_activity` (event_type='action')
- `startHeartbeat()` — a cada 60s faz UPSERT em `user_sessions.last_seen_at = now()`
- Tudo silencioso (try/catch, nunca quebra a UI)

**Integração em `src/App.tsx`**:
- Hook `useLocation` → dispara `trackPageView` em cada mudança de rota
- `useEffect` no mount → `startHeartbeat()`

**Integração mínima em ações-chave** (já que o usuário pediu): adicionar `trackAction('export', {page})` nos botões de exportar Excel das telas analíticas (módulo financeiro, compras, produção). Sem alterar a lógica existente.

### Mudança 4 — UI: nova aba "Monitoramento" em `ConfiguracoesPage.tsx`

Adicionar `<TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>` (visível só para admin) e `<TabsContent value="monitoramento">` com:

**Card 1 — Online agora**
- Lista usuários com `last_seen_at >= now() - interval '2 minutes'`
- Colunas: Nome, Email, Página atual, Há quanto tempo (ex: "30s atrás")
- Auto-refresh a cada 30s

**Card 2 — Histórico de navegação (últimos 7 dias)**
- Filtros: usuário (combobox), período (24h/7d), tipo de evento
- Tabela: Data/Hora, Usuário, Tipo (badge: page_view / action), Página, Ação
- Paginação (50 por página)

**Card 3 — Top métricas**
- Total de acessos (últimas 24h)
- Páginas mais acessadas (top 5)
- Usuários mais ativos (top 5)

Botão "Atualizar" e "Limpar histórico" (admin).

---

### Detalhes técnicos
- Tracking não bloqueia render (fire-and-forget).
- Heartbeat só roda se `auth.uid()` existir.
- Sem mudança na sidebar ou rotas existentes.
- A aba é renderizada apenas se `isAdmin === true` (já há esse check no componente).

### Fora de escopo
- Geolocalização/IP do usuário.
- Gráfico temporal de uso (linha ao longo do dia).
- Notificações em tempo real via Supabase Realtime (pode ser fase 2).
- Tracking em todos os botões — só os de exportar nesta primeira versão.

### Resultado
Admin abre Configurações → aba "Monitoramento" e vê: quem está online agora, o que cada usuário acessou nos últimos 7 dias, e quais ações principais (exports) realizaram. Histórico é limpo automaticamente toda semana.

