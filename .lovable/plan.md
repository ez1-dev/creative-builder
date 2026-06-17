# DRE — Drill-down por célula + Exceções por lançamento

## Objetivo
1. Permitir abrir qualquer célula da matriz DRE em 8 tipos de drill.
2. Dentro de cada linha do drill `LANCAMENTO`, permitir marcar como **Exceção DRE**, redirecionando o lançamento de uma linha da DRE para outra **sem mexer em regra geral / TNS**.

## 1. Frontend

### 1.1 Menu de drill na célula
- Em `src/pages/bi/contabilidade/DrePage.tsx`, envolver cada `<td>` de Realizado (mensal + total) em `ContextMenu` + ícone `MoreVertical` em hover.
- Opções, nesta ordem:
  1. **Reabrir** — só nas linhas calculadas.
  2. Centro de Custos (`CENTRO_CUSTO`)
  3. Conta Contábil (`CONTA`)
  4. Origem do Lançamento (`ORIGEM`)
  5. Transação (`TRANSACAO`)
  6. Histórico (`HISTORICO`)
  7. Lançamento (`LANCAMENTO`)
  8. Unidade de Negócio (`UNIDADE`)

### 1.2 Drawer de drill (`DreDrillDrawer.tsx`)
- Usa `DrillSheet` + `useDrillSheet` (já existem em `src/components/bi/drill/`).
- Chips: linha, período, unidade, tipo, anomes (se mensal).
- Tabela: `columns[]` + `rows[]` do payload + totalizador no rodapé.
- Drill `REABRIR` (calculadas): lista os componentes da fórmula com valor; cada um vira novo nível na pilha.
- Drill `LANCAMENTO`: cada linha tem botão **"Marcar exceção"** que abre o modal §1.4.

### 1.3 Hook `useDreDrill`
Pilha simples (`openWith / push / pop`), reaproveitando `useDrillSheet`.

### 1.4 Modal "Marcar exceção DRE" (`DreExcecaoModal.tsx`)
Campos (pré-preenchidos a partir da linha do drill `LANCAMENTO`, todos editáveis):

| Campo                     | Origem                                  |
| ------------------------- | --------------------------------------- |
| Código linha origem       | linha atual da DRE                      |
| Código linha destino      | combobox com todas as linhas; default = `NAO_CLASSIFICADO` |
| Motivo                    | textarea obrigatório                    |
| Lançamento (`nr_lancamento`) | linha do drill                       |
| Lote                      | linha do drill                          |
| Documento                 | linha do drill                          |
| Máscara / cd_conta        | linha do drill                          |
| Centro de Custo           | linha do drill                          |
| Origem                    | linha do drill                          |
| Transação (TNS)           | linha do drill                          |
| Histórico                 | linha do drill                          |
| Valor                     | `vl_realizado` da linha                 |

Botão Salvar grava no Cloud (§2) e fecha. Toast + refetch do drill atual.

## 2. Lovable Cloud — tabela de exceções

Migração nova:
```sql
create table public.bi_dre_excecoes (
  id uuid primary key default gen_random_uuid(),
  nr_lancamento  text not null,
  nr_lote        text,
  nr_documento   text,
  cd_conta       text,
  cd_cencus      text,
  cd_origem      text,
  cd_transacao   text,
  ds_historico   text,
  anomes_referente int,
  vl_realizado   numeric,
  codigo_linha_origem  text not null,
  codigo_linha_destino text not null default 'NAO_CLASSIFICADO',
  motivo         text not null,
  ativo          boolean not null default true,
  criado_por     uuid references auth.users(id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (nr_lancamento, codigo_linha_origem)
);

grant select, insert, update, delete on public.bi_dre_excecoes to authenticated;
grant all on public.bi_dre_excecoes to service_role;

alter table public.bi_dre_excecoes enable row level security;

create policy "Authenticated read" on public.bi_dre_excecoes
  for select to authenticated using (true);
create policy "Authenticated write" on public.bi_dre_excecoes
  for insert to authenticated with check (auth.uid() is not null);
create policy "Owner/admin update" on public.bi_dre_excecoes
  for update to authenticated
  using (criado_por = auth.uid() or public.is_admin(auth.uid()));
create policy "Admin delete" on public.bi_dre_excecoes
  for delete to authenticated using (public.is_admin(auth.uid()));
```

Frontend grava direto via `supabase.from('bi_dre_excecoes')`.

## 3. Backend FastAPI

### 3.1 Novo endpoint — `docs/backend-bi-contabilidade-dre-drill.md`
```
GET /api/bi/contabilidade/dre-drill
  ?ano=2026&mes_ini=01&mes_fim=12
  &anomes_referente=202603        # opcional, célula mensal
  &codigo_linha=RECEITA_BRUTA
  &tipo_drill=LANCAMENTO          # CENTRO_CUSTO|CONTA|ORIGEM|TRANSACAO|HISTORICO|LANCAMENTO|UNIDADE|REABRIR
  &unidade=GENIUS                 # vazio = TODOS
```
Chama RPC `public.bi_dre_drill_realizado(p_ano, p_mes_ini, p_mes_fim, p_codigo_linha, p_tipo_drill, p_unidade, p_anomes_referente)` retornando `chave / descricao / vl_realizado` (+ campos extras para `LANCAMENTO`: `nr_lancamento, nr_lote, nr_documento, cd_conta, cd_cencus, cd_origem, cd_transacao, ds_historico, anomes_referente`).
- `Decimal → float`, `traceback.print_exc()`, `HTTPException(502, detail=str(e))`.
- `REABRIR` não chama RPC — devolve componentes da fórmula (§4) somando cada um via subchamada `tipo_drill=TOTAL`.

### 3.2 RPC `public.bi_dre_drill_realizado` (spec — backend cria manualmente)
Base: `bi_vm_lanc_contabil l` + `LEFT JOIN LATERAL (select … from bi_dre_regras r where <match> order by prioridade limit 1) reg ON true`.
- **Não usar** `bi_dre_mascara`, **não alterar** `bi_dre_regras`.
- Filtros: ano, intervalo de meses, `anomes_referente` opcional, unidade opcional, `reg.codigo_linha = p_codigo_linha`.
- Valor: `SUM(coalesce(vl_saldo, coalesce(vl_credito,0)-coalesce(vl_debito,0))) * coalesce(reg.sinal,1)`.
- Aplicar exceções: `LEFT JOIN public.bi_dre_excecoes e ON e.ativo AND e.nr_lancamento = l.nr_lancamento AND e.codigo_linha_origem = reg.codigo_linha`.
  - Linha computada usa `coalesce(e.codigo_linha_destino, reg.codigo_linha)` como `codigo_linha` efetivo.
- Agrupamento varia por `p_tipo_drill` (CC, conta, origem, transação, histórico, unidade). Para `LANCAMENTO` retorna por linha (sem agregação) com todos os campos do lançamento.

### 3.3 RPC `bi_dre_realizado_regras` (já existe e é usada pelo `dre-matriz`)
Aplicar a mesma lógica de exceções: `LEFT JOIN bi_dre_excecoes` e usar `coalesce(e.codigo_linha_destino, reg.codigo_linha)`. Documentar isso no doc backend; **não** mexer no SQL aqui — só registrar o ajuste necessário para o time backend.

## 4. Linhas calculadas (`REABRIR`) — `src/lib/bi/dreReabrir.ts`
```
RECEITA_LIQUIDA       = RECEITA_BRUTA + DEDUCOES_VENDAS
CUSTO_TOTAL           = CUSTO_PRODUCAO_VENDA + CUSTO_MEX
LUCRO_BRUTO           = RECEITA_LIQUIDA + CUSTO_TOTAL
EBITDA                = LUCRO_BRUTO + DESPESAS_COMERCIAIS + DESPESAS_ADMINISTRATIVAS
EBIT                  = EBITDA + DEPRECIACAO
RESULTADO_EXERCICIO   = EBIT + RECEITAS_FINANCEIRAS + DESPESAS_FINANCEIRAS
                          + RECEITAS_NAO_OPERACIONAIS + DESPESAS_NAO_OPERACIONAIS + FAZENDA
```

## 5. Tela de gestão de exceções
`/bi/contabilidade/dre/excecoes` (`DreExcecoesPage.tsx`):
- Lista paginada de `bi_dre_excecoes` com filtros (período, linha origem, linha destino, ativo).
- Ações: editar (motivo / destino), desativar, reativar.
- Link no header do `DrePage` ("Exceções").

## 6. Princípios reforçados (memória deste módulo)
- **Não** criar regra geral por TNS.
- **Não** filtrar/bloquear todas as ocorrências de `1-5101S`, `1-6101S`, `1-6933S`, `1-1201E`, `1-2201`.
- Correção sempre por **lançamento × linha origem** (chave única na tabela).
- Linhas válidas dessas mesmas TNS em outros documentos continuam classificadas pela regra normal.

## 7. Arquivos
- **Edita:** `src/pages/bi/contabilidade/DrePage.tsx`
- **Cria:**
  - `src/components/bi/contabilidade/DreDrillDrawer.tsx`
  - `src/components/bi/contabilidade/DreExcecaoModal.tsx`
  - `src/hooks/useDreDrill.ts`
  - `src/lib/bi/dreReabrir.ts`
  - `src/lib/bi/dreExcecoesApi.ts`
  - `src/pages/bi/contabilidade/DreExcecoesPage.tsx` (+ rota em `App.tsx` e item no sidebar)
  - `docs/backend-bi-contabilidade-dre-drill.md`
  - Migration: `bi_dre_excecoes`
- **Não toca:** `bi_dre_mascara`, `bi_dre_regras`, `bi_dre_estrutura`, endpoint `dre-matriz`.

## Critérios de aceite
1. Clique direito em célula Realizado abre menu com 8 opções; "Reabrir" só nas calculadas.
2. Drill `LANCAMENTO` lista cada lançamento com botão "Marcar exceção".
3. Modal pré-preenche todos os campos a partir da linha; destino default = `NAO_CLASSIFICADO`; motivo obrigatório.
4. Após salvar, o lançamento sai do total da linha origem e entra na destino no próximo recálculo da DRE (depende do ajuste de `bi_dre_realizado_regras` documentado para backend).
5. Tela `/bi/contabilidade/dre/excecoes` permite editar/desativar exceções.
6. Nenhuma regra geral por TNS é criada.
