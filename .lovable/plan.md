## Objetivo

Criar a tabela `public.usu_log_navegacao_erp` para registrar **toda navegação dos usuários no ERP Web** (a cada troca de rota) e a view `public.vw_ultima_tela_usuario` com a última tela acessada por usuário. Em seguida, integrar o tracking automático no frontend.

## 1. Migração — schema + RLS

```sql
-- Enum de ação (cobre os casos do ERP Web e deixa hooks para uso futuro Senior)
CREATE TYPE public.navegacao_acao AS ENUM (
  'entrar',     -- abriu a tela
  'sair',       -- saiu da tela (beforeunload / troca)
  'click',      -- ação relevante dentro da tela
  'erro'        -- erro visível para o usuário
);

CREATE TABLE public.usu_log_navegacao_erp (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    text,
  erp_user      text,                                  -- login Senior (quando houver)
  sistema       text NOT NULL DEFAULT 'ERP_WEB',       -- ERP_WEB | ERP_SENIOR | API
  tela_codigo   text,                                  -- rota/path ou cod_modulo Senior
  tela_nome     text,                                  -- label amigável
  acao          public.navegacao_acao NOT NULL DEFAULT 'entrar',
  computador    text,                                  -- hostname (vazio no web; preenchido se Senior enviar)
  ip            text,                                  -- preenchido por edge function/Senior
  user_agent    text,
  session_id    text,                                  -- auth session id ou id local
  detalhes      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_usu_log_navegacao_user_created
  ON public.usu_log_navegacao_erp (user_id, created_at DESC);
CREATE INDEX idx_usu_log_navegacao_erp_user_created
  ON public.usu_log_navegacao_erp (erp_user, created_at DESC);
CREATE INDEX idx_usu_log_navegacao_sistema_created
  ON public.usu_log_navegacao_erp (sistema, created_at DESC);

ALTER TABLE public.usu_log_navegacao_erp ENABLE ROW LEVEL SECURITY;

-- Insert: usuário autenticado pode inserir as próprias linhas (ERP Web).
CREATE POLICY "Users insert own navegacao"
ON public.usu_log_navegacao_erp FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Select: usuário lê o próprio histórico; admin lê tudo.
CREATE POLICY "Users read own navegacao"
ON public.usu_log_navegacao_erp FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all navegacao"
ON public.usu_log_navegacao_erp FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete navegacao"
ON public.usu_log_navegacao_erp FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));
```

```sql
-- View: última tela por usuário (combina user_id e erp_user)
CREATE OR REPLACE VIEW public.vw_ultima_tela_usuario
WITH (security_invoker = true) AS
SELECT DISTINCT ON (COALESCE(user_id::text, erp_user))
  user_id,
  user_email,
  erp_user,
  sistema,
  tela_codigo,
  tela_nome,
  acao,
  computador,
  ip,
  user_agent,
  session_id,
  created_at AS ultima_navegacao
FROM public.usu_log_navegacao_erp
ORDER BY COALESCE(user_id::text, erp_user), created_at DESC;
```

```sql
-- Limpeza automática (mantém 90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_navegacao_logs()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.usu_log_navegacao_erp
  WHERE created_at < now() - interval '90 days';
$$;
```

## 2. Frontend — registrar navegação automaticamente

### `src/lib/screenCatalog.ts` (novo)
Mapa `path → { codigo, nome }` para resolver `tela_codigo`/`tela_nome` a partir da rota. Usa match exato + prefixo. Ex.:
```ts
'/dashboard'         → { codigo: 'DASH',         nome: 'Dashboard' }
'/passagens-aereas'  → { codigo: 'PASSAGENS',    nome: 'Passagens Aéreas' }
'/monitor-usuarios-senior' → { codigo: 'MON_SR', nome: 'Monitor Usuários Senior' }
'/configuracoes'     → { codigo: 'CONFIG',       nome: 'Configurações' }
```
Fallback: `codigo = path`, `nome = path` capitalizado.

### `src/lib/userTracking.ts`
Adicionar função `trackNavegacao(path)` chamada junto com `trackPageView`:
- Resolve `screenCatalog` para `tela_codigo`/`tela_nome`.
- Lê `erp_user` de `localStorage.getItem('erp_user')`.
- Lê `session_id` de `supabase.auth.getSession()` (ou gera id local persistido em `localStorage`).
- Insere em `usu_log_navegacao_erp` com `acao='entrar'`, `sistema='ERP_WEB'`, `user_agent=navigator.userAgent`.
- IP: deixado em branco no client (necessitaria edge function — fora do escopo desta etapa, mas o campo já existe).
- Registra `acao='sair'` em `beforeunload` da tela anterior (best-effort com `navigator.sendBeacon` para a REST do Supabase quando possível, senão um insert direto).

### `src/components/UserTrackingProvider.tsx`
- Já chama `trackPageView(location.pathname)` em cada mudança de rota; adicionar `trackNavegacao(location.pathname)` no mesmo efeito.
- Registrar `beforeunload` listener uma vez para gravar `acao='sair'` da última tela.

### `src/integrations/supabase/types.ts`
Será regenerado automaticamente pelo Lovable após a migration; não editar à mão.

## 3. Observação sobre ERP Senior nativo (registrada na descrição da tabela)

Adicionar `COMMENT ON TABLE` explicando que o Senior nativo só populará esta tabela se uma customização/regra/API publicar eventos via REST com `service_role`. R911SEC e R911MOD continuam dando conexão e módulo/licença — não a tela.

```sql
COMMENT ON TABLE public.usu_log_navegacao_erp IS
'Log de navegação por tela. ERP Web grava automaticamente. Para ERP Senior nativo, requer customização/API enviando eventos — R911SEC/R911MOD não expõem a tela exata.';
```

## Sem mudanças
- `user_activity` continua existindo (tracking genérico de eventos). A nova tabela é específica para navegação por tela e tem campos do ERP (erp_user, sistema, tela_codigo).

Após aprovação executo a migration e atualizo o frontend.
