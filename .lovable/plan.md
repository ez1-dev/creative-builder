# Restaurar o card "Devoluções" no BI Comercial

## Diagnóstico (a confirmar)
A fiação do drill de devoluções já existe e está correta:
- `ComercialPage.tsx:693-715` mapeia clique no KPI `devolucao` → `openDrill('NOTA_FISCAL', {}, { nfContext: 'DEVOLUCOES' })`
- Drawer envia `nf_context: 'DEVOLUCOES'` + `somente_devolucao: true` no body
- `COMERCIAL_DEFAULT_WIDGETS` inclui `kpi-devolucao` na posição 3

O card não aparece porque o **layout persistido** (`dashboard_widgets` da dashboard efetiva — Oficial ou "Minha versão") tem o bloco `kpi-devolucao` marcado como `hidden: true` (via `config.hidden`), ou foi removido em algum reset. `visibleWidgets` em `ComercialPage.tsx:980` filtra `!w.hidden`, então o KPI some da grid — sem ele, não há por onde disparar o drill.

## Passo 1 — Confirmar o estado real (leitura only)
Antes de escrever qualquer coisa, consultar no Cloud:
```sql
select d.id, d.owner_id, d.is_default, w.type, w.position,
       (w.config->>'hidden')::bool as hidden
  from dashboards d
  left join dashboard_widgets w on w.dashboard_id = d.id and w.type = 'kpi-devolucao'
 where d.module = 'bi-comercial';
```
Isso mostra, para a dashboard Oficial e para cada dashboard pessoal, se existe uma linha `kpi-devolucao` e se está oculta.

## Passo 2 — Corrigir os registros
Dependendo do resultado:
- **Existe com `hidden=true`** → `UPDATE dashboard_widgets SET config = jsonb_set(coalesce(config,'{}'::jsonb), '{hidden}', 'false'::jsonb) WHERE type = 'kpi-devolucao';`
- **Não existe** → `INSERT` usando `layout {x:9,y:0,w:3,h:3}`, `title 'Devoluções'`, `position 3`, `config {"variant":"number"}`, resolvendo `block_id` via a mesma lógica de `ensureDefaultBlockId`.

Faço isso pelo menos para a dashboard Oficial. Se o usuário logado tiver "Minha versão", corrijo lá também.

## Passo 3 — Prevenir recorrência
Pequeno ajuste no frontend em `useComercialLayout.ts`:
- Em `mergeWithDefaults`, quando um `type` default está presente na lista salva mas com `hidden=true` **e** nunca foi explicitamente editado pelo usuário nesta sessão, não alterar nada (respeitar customização). Ou seja, não mexer nesse comportamento — a correção é só de dados.
- Adicionar botão "Restaurar blocos padrão ocultos" no menu "Adicionar bloco" (`ComercialPage.tsx` — diálogo de add block) que faz `saveLayout` marcando `hidden: false` para todos os defaults ocultos. Assim o usuário resolve sozinho no futuro sem depender de SQL.

## Passo 4 — Validar
1. Recarregar `/bi/comercial` → o card "Devoluções" aparece na primeira linha da grid, valor em vermelho.
2. Clique no card → drawer abre com título "Notas Fiscais — somente devoluções", badge de recorte, e o body do request contém `nf_context:"DEVOLUCOES"`, `somente_devolucao:true` (validar no Network).
3. Rodar `tsgo` para garantir que nenhum tipo quebrou.

## Detalhes técnicos
- Nenhum contrato de API muda; o backend já recebe `somente_devolucao` no POST `/api/bi/comercial/drill`.
- Nenhuma migration nova — só `UPDATE`/`INSERT` de dados em `dashboard_widgets` via `supabase--read_query` + `supabase--insert`/RPC.
- Se houver dashboards pessoais de outros usuários também com o card oculto, o mesmo `UPDATE` amplo (`WHERE type='kpi-devolucao' AND (config->>'hidden')::bool IS TRUE`) resolve todos de uma vez.
