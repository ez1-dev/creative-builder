## Diagnóstico

Você quer um **botão "Aplicar regras agora"** na tela `/monitor-usuarios-senior` que:

1. Avalia cada sessão ativa contra um conjunto de regras configuráveis.
2. Mostra um **preview** (lista de quem cairia + qual regra disparou) antes de executar.
3. Após confirmação, dispara `POST /api/senior/sessoes/{numsec}/desconectar` em lote.
4. Respeita uma **whitelist de usuários Senior** que nunca podem ser derrubados.

Tudo client-side + Cloud (config) + backend FastAPI já existente. Sem cron, sem edge function, sem feriados (você decidiu deixar pra depois).

## Mudanças

### 1) Cloud — duas tabelas novas

**`senior_disconnect_rules`** — uma linha por regra. Permite ligar/desligar e ajustar parâmetros.

```sql
CREATE TABLE public.senior_disconnect_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key        text NOT NULL UNIQUE,           -- 'fora_horario', 'ocioso_sem_modulo', 'sessao_longa', 'custom_<n>'
  nome            text NOT NULL,
  descricao       text,
  enabled         boolean NOT NULL DEFAULT false,
  params          jsonb NOT NULL DEFAULT '{}',    -- ver formato abaixo
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.senior_disconnect_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read rules"  ON public.senior_disconnect_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage rules"       ON public.senior_disconnect_rules FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON public.senior_disconnect_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Seed inicial (3 regras prontas, todas **desligadas**):

| rule_key | params (exemplo) |
|---|---|
| `fora_horario` | `{ "dias_semana": [0,6], "hora_inicio_bloqueio": 22, "hora_fim_bloqueio": 6 }` (0=domingo, 6=sábado) |
| `ocioso_sem_modulo` | `{ "minutos_sem_modulo": 30, "modulos_considerados_ociosos": ["", "All", "-"] }` |
| `sessao_longa` | `{ "horas_maximo": 12 }` |

**`senior_disconnect_whitelist`** — usuários Senior protegidos.

```sql
CREATE TABLE public.senior_disconnect_whitelist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario      text NOT NULL,                    -- AppUsr (sempre comparado em UPPER)
  motivo       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid
);
CREATE UNIQUE INDEX ux_senior_wl_usuario ON public.senior_disconnect_whitelist (upper(usuario));
ALTER TABLE public.senior_disconnect_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read wl"  ON public.senior_disconnect_whitelist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage wl"       ON public.senior_disconnect_whitelist FOR ALL    TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
```

Seed: `RENATO`, `ADMIN`, `EMDC`, `INTEGRACAO`. Você ajusta depois pela tela.

> Schema novo → uso o tool de migração. Os dados-seed vão pelo tool de insert.

### 2) Frontend — avaliador de regras (puro JS)

Novo arquivo `src/lib/seniorRules.ts`:

```ts
export type Rule =
  | { rule_key: 'fora_horario';     enabled: boolean; params: { dias_semana: number[]; hora_inicio_bloqueio: number; hora_fim_bloqueio: number } }
  | { rule_key: 'ocioso_sem_modulo'; enabled: boolean; params: { minutos_sem_modulo: number; modulos_considerados_ociosos: string[] } }
  | { rule_key: 'sessao_longa';      enabled: boolean; params: { horas_maximo: number } }
  | { rule_key: string;              enabled: boolean; params: Record<string, any> }; // custom

export interface Avaliacao {
  sessao: SessaoSenior;
  rule_key: string;
  motivo: string;        // string pronta pra log: "Domingo após 22:00 (regra: fora_horario)"
}

export function avaliarSessoes(
  sessoes: SessaoSenior[],
  rules: Rule[],
  whitelist: string[],   // sempre em UPPER
  agora = new Date(),
): Avaliacao[]
```

A função:

- Pula qualquer sessão cujo `usuario_senior.toUpperCase()` esteja na whitelist.
- Pula a sessão do usuário logado (não derrubar a si mesmo).
- Aplica cada regra ligada na ordem; **primeira que disparar** vence (não duplica).
- Retorna lista pronta pra exibir no preview.

Lógica das 3 regras built-in:
- **fora_horario**: dispara se `agora.getDay() ∈ dias_semana` **OU** (em qualquer dia) `agora.getHours() >= hora_inicio_bloqueio || agora.getHours() < hora_fim_bloqueio`.
- **ocioso_sem_modulo**: dispara se `cod_modulo` estiver em `modulos_considerados_ociosos` E `minutos_conectado >= minutos_sem_modulo`.
- **sessao_longa**: dispara se `minutos_conectado >= horas_maximo * 60`.

Testes unitários cobrindo: sábado 14h, terça 23h, terça 14h ocioso 30min, RENATO em horário bloqueado (não cai), sessão 13h.

### 3) Frontend — `MonitorUsuariosSeniorPage`

Adicionar:

- Hook `useSeniorRules()` que carrega `senior_disconnect_rules` + `senior_disconnect_whitelist` do Cloud (com `useEffect` + `supabase.from`).
- Botão **"Aplicar regras agora"** ao lado de "Atualizar" no header (somente `canDisconnect` — admin/RENATO).
- Modal com:
  - Resumo: "X sessões serão desconectadas" + chips por regra que disparou.
  - Tabela compacta: usuário, computador, módulo, minutos, **motivo**.
  - Campo motivo geral (obrigatório, mín 5 chars, vai pro log de cada desconexão).
  - Botão **Confirmar desconexão em lote**.
- Execução: roda os POST sequencialmente (não paralelo, pra não detonar o backend FastAPI), com barra de progresso "3/15 desconectadas". Toast final consolidado: "12 desconectadas, 3 falharam".
- Após terminar → `await load()` pra recarregar a tabela.

### 4) Frontend — Configurações: nova aba "Regras de Desconexão Senior"

Em `src/pages/ConfiguracoesPage.tsx`, adicionar uma seção (somente admin):

- Lista das 3 regras com **switch** (enabled) e formulário dos `params` específicos:
  - `fora_horario`: checkboxes Dom/Seg/...Sáb + dois selects de hora (início bloqueio / fim bloqueio).
  - `ocioso_sem_modulo`: input minutos + tags de módulos considerados ociosos.
  - `sessao_longa`: input horas.
- Lista da whitelist com input "adicionar usuário Senior" + botão remover.
- "Other: deixa configurar uma regra" → por enquanto, regras custom são suportadas no schema (`rule_key` livre + `params` jsonb), mas a UI de criação fica no roadmap. Isso não bloqueia nada — o admin pode adicionar uma regra custom direto via SQL e o avaliador ignora `rule_key` desconhecido (só roda built-ins). Quando você quiser regras custom de fato, a gente adiciona o builder.

### 5) Frontend — entrada em `ALL_SCREENS` permanece a mesma; só protege a aba nova de Configurações via `is_admin`.

## O que NÃO muda

- Endpoint backend `POST /api/senior/sessoes/{numsec}/desconectar` (já documentado em `docs/backend-senior-desconectar-sessao.md`). O lote chama o mesmo endpoint N vezes.
- Botão **Desconectar** individual em cada linha — continua existindo.
- Auth, RLS de outras tabelas, layout geral.
- Feriados — fica fora do escopo (você pediu pra ignorar).

## Validação

1. Migração roda sem erro; `SELECT * FROM senior_disconnect_rules` mostra 3 regras desligadas.
2. Em **Configurações → Regras de Desconexão Senior**, ligar `fora_horario` com domingo+sábado+22h..06h. Adicionar `RENATO` na whitelist.
3. Em `/monitor-usuarios-senior`, num domingo 14h, clicar **Aplicar regras agora** → modal lista todas as sessões exceto RENATO, com motivo "Domingo (regra: fora_horario)".
4. Confirmar → barra de progresso → toast "N desconectadas". Tabela recarrega.
5. Numa terça 14h com a regra `ocioso_sem_modulo` ligada (30min), só sessões com `cod_modulo` vazio/All há ≥30min aparecem no preview.
6. Tentar desconectar a si mesmo → automaticamente filtrado.
7. Whitelist com `EMDC` → integrações nunca caem.
