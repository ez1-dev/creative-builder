## Objetivo

1. Criar tabela `public.bi_meta_faturamento` no Lovable Cloud.
2. Tela `/bi/comercial/metas` com CRUD (listar, criar, editar, ativar/inativar), upsert por `(anomes_emissao, unidade_negocio)`.
3. Sobrescrever no BI Comercial os cards **Meta**, **Diferença** e **% Atingimento** com a soma calculada a partir dessa tabela.

## 1. Migração — `public.bi_meta_faturamento`

```sql
CREATE TABLE public.bi_meta_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomes_emissao text NOT NULL,            -- formato 'YYYYMM'
  unidade_negocio text NOT NULL
    CHECK (unidade_negocio IN ('GENIUS','ESTRUTURAL ZORTEA')),
  vl_meta numeric(18,2) NOT NULL DEFAULT 0,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users,
  updated_by uuid REFERENCES auth.users,
  UNIQUE (anomes_emissao, unidade_negocio)
);
GRANT SELECT ON public.bi_meta_faturamento TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bi_meta_faturamento TO authenticated;
GRANT ALL ON public.bi_meta_faturamento TO service_role;
ALTER TABLE public.bi_meta_faturamento ENABLE ROW LEVEL SECURITY;

-- Leitura: todo usuário autenticado vê as metas (são números corporativos)
CREATE POLICY "metas_select_auth" ON public.bi_meta_faturamento
  FOR SELECT TO authenticated USING (true);

-- Escrita: apenas admins ou quem tem can_edit em /bi/comercial/metas
CREATE OR REPLACE FUNCTION public.can_edit_bi_meta(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.user_access ua
    JOIN public.profiles p ON upper(p.erp_user)=upper(ua.user_login)
    JOIN public.profile_screens ps ON ps.profile_id=ua.profile_id
    WHERE p.id=_uid AND ps.screen_path='/bi/comercial/metas' AND ps.can_edit=true
  );
$$;

CREATE POLICY "metas_write_admin" ON public.bi_meta_faturamento
  FOR ALL TO authenticated
  USING (public.can_edit_bi_meta(auth.uid()))
  WITH CHECK (public.can_edit_bi_meta(auth.uid()));

CREATE TRIGGER bi_meta_faturamento_updated_at
  BEFORE UPDATE ON public.bi_meta_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Não há linha **CONSOLIDADO**: o `CHECK` bloqueia o cadastro manual.

## 2. Tela `/bi/comercial/metas`

Arquivo `src/pages/bi/MetasFaturamentoPage.tsx`, registrada em `src/App.tsx`.

**Layout:** header com filtros de período (Ano + opcional UN) e botão "Nova meta". Tabela ocupa o corpo.

**Tabela (uma linha por meta cadastrada):**

| Anomês | Unidade | Meta (R$) | Observação | Ativo | Ações |

- Ordenação default: `anomes_emissao DESC, unidade_negocio`.
- Linha extra somente leitura por anomês exibindo "CONSOLIDADO = GENIUS + ESTRUTURAL ZORTEA" calculado em memória, fora da grade de edição.

**Dialog "Nova/Editar meta"** (mesmo componente, ambos via `useId` + `htmlFor`):
- `anomes_emissao` — Input mask `YYYY-MM` (salva como `YYYYMM`).
- `unidade_negocio` — Select com apenas `GENIUS` e `ESTRUTURAL ZORTEA`.
- `vl_meta` — Input number (R$).
- `observacao` — Textarea opcional.
- `ativo` — Switch (default true).

**Ações por linha:**
- Editar (abre o mesmo dialog preenchido).
- Toggle ativar/inativar (update direto de `ativo`).
- Excluir (com confirm).

**Persistência:**
```ts
supabase.from('bi_meta_faturamento').upsert(
  { anomes_emissao, unidade_negocio, vl_meta, observacao, ativo },
  { onConflict: 'anomes_emissao,unidade_negocio' }
)
```

Hook dedicado em `src/lib/bi/metasFaturamentoApi.ts`: `listMetas(anomesIni,anomesFim)`, `upsertMeta`, `toggleAtivo`, `deleteMeta`.

Acessibilidade: todos os campos com `id`/`name`/`<Label htmlFor>` seguindo o padrão recém aplicado.

**Acesso à tela:**
- Rota no `App.tsx` dentro do layout autenticado.
- Item no menu lateral em "BI Comercial → Metas" (mesmo agrupamento do BI).
- Botão atalho "Cadastrar metas" no header do BI Comercial (admin/edit).

## 3. BI Comercial — sobrescrever Meta, Diferença e % Atingimento

`src/pages/bi/ComercialPage.tsx` já consome `kpis` via `fetchComercialKpis(filters)`.

Acrescentar **um novo query paralelo** que lê do Cloud:

```ts
const qMetaCloud = useQuery({
  queryKey: ['bi-comercial','meta-cloud', filters.anomes_ini, filters.anomes_fim, filters.unidade_negocio],
  queryFn: () => fetchMetaCloudTotal(filters),
});
```

`fetchMetaCloudTotal` (novo, em `metasFaturamentoApi.ts`):
- Lê linhas com `ativo = true`, `anomes_emissao BETWEEN ini AND fim`.
- Se `filters.unidade_negocio === 'CONSOLIDADO'` → soma das duas UNs.
- Caso contrário → soma da UN selecionada.

No ComercialPage, depois de obter `kpis`, montar `kpisEffective`:

```ts
const metaOverride = qMetaCloud.data ?? null;
const kpisEffective = useMemo(() => {
  if (metaOverride == null) return kpis;
  const meta = metaOverride;
  const fat = n(kpis.faturamento);
  return {
    ...kpis,
    meta,
    diferenca: fat - meta,
    pct_atingimento: meta > 0 ? (fat / meta) * 100 : null,
  };
}, [kpis, metaOverride]);
```

Usar `kpisEffective` em todos os pontos do arquivo onde hoje se lê `kpis.meta`, `kpis.diferenca`, `kpis.pct_atingimento` e em `<KpiTargetCard ... target={kpis.meta}/>`. O resto (faturamento, líquido, etc.) continua vindo do FastAPI sem alteração.

Comportamento quando ainda não houver meta cadastrada para o período: cards mostram `—` (mantém o tratamento atual de null). Não sobrescrevemos a meta do ERP nesse caso? **Decisão proposta:** se não houver linhas em `bi_meta_faturamento` para o período/UN, mantém o valor vindo do ERP (não sobrescreve). Isso evita zerar a meta em períodos não cadastrados. Confirme se prefere o contrário.

A série mensal do gráfico (`fetchComercialMensal`) continua usando a meta do ERP por mês — fora do escopo desta tarefa; pode ser próxima iteração se quiser.

## 4. Permissões / menu

- Adicionar `/bi/comercial/metas` ao seed de `profile_screens` no perfil Administrador (e qualquer perfil que hoje vê `/bi/comercial`).
- Item de menu em `src/components/layout/...` (mesma seção do BI Comercial).

## Checklist de entrega

1. Migration aprovada.
2. `src/lib/bi/metasFaturamentoApi.ts` — list/upsert/toggle/delete + `fetchMetaCloudTotal`.
3. `src/pages/bi/MetasFaturamentoPage.tsx` — tabela + dialog.
4. Rota e item de menu.
5. `ComercialPage.tsx` — `kpisEffective` aplicado nos três cards.
6. Validação manual: cadastrar meta GENIUS + ESTRUTURAL para 202606, abrir BI Comercial → cards refletem soma; trocar filtro de UN → muda Meta proporcionalmente.
