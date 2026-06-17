---
name: DRE — Drill-down + Exceções por lançamento
description: Página /bi/contabilidade/dre tem menu de drill por célula (Reabrir, CC, Conta, Origem, Transação, Histórico, Lançamento, Unidade) chamando GET /api/bi/contabilidade/dre-drill (RPC bi_dre_drill_realizado). Exceções de lançamento × linha origem ficam em public.bi_dre_excecoes no Lovable Cloud e são aplicadas na RPC bi_dre_realizado_regras para refletir na matriz.
type: feature
---

# Drill-down DRE + Exceções

## Frontend
- `src/pages/bi/contabilidade/DrePage.tsx` envolve cada célula de Realizado em `ContextMenu`.
  - Opções: Reabrir (só linhas calculadas), Centro de Custos, Conta Contábil, Origem, Transação, Histórico, Lançamento, Unidade.
  - Duplo-clique vai direto para `LANCAMENTO`.
- Drawer: `src/components/bi/contabilidade/DreDrillDrawer.tsx` (pilha via `useDreDrill` em `src/hooks/`).
- Modal exceção: `src/components/bi/contabilidade/DreExcecaoModal.tsx`.
- API drill: `src/lib/bi/dreDrillApi.ts` → `GET /api/bi/contabilidade/dre-drill`.
- API exceções: `src/lib/bi/dreExcecoesApi.ts` (Lovable Cloud).
- Linhas calculadas: `src/lib/bi/dreReabrir.ts` (REABRIR é resolvido no front somando os componentes).
- Tela de gestão: `/bi/contabilidade/dre/excecoes` (`DreExcecoesPage`).

## Backend (spec)
`docs/backend-bi-contabilidade-dre-drill.md` — endpoint chama RPC
`public.bi_dre_drill_realizado(p_ano, p_mes_ini, p_mes_fim, p_codigo_linha, p_tipo_drill, p_unidade, p_anomes_referente)`.
Base: `bi_vm_lanc_contabil` + `LEFT JOIN LATERAL bi_dre_regras ORDER BY prioridade LIMIT 1`.
Não usar `bi_dre_mascara`. Não alterar `bi_dre_regras`.
RPC `bi_dre_realizado_regras` (matriz) precisa do mesmo `LEFT JOIN bi_dre_excecoes` para refletir as exceções.

## Cloud
Tabela `public.bi_dre_excecoes` com UNIQUE (nr_lancamento, codigo_linha_origem),
default destino `NAO_CLASSIFICADO`, motivo obrigatório, RLS autenticados.

## Regras
- Correção é sempre por lançamento × linha origem. NUNCA criar regra geral por TNS.
- Não bloquear todas as ocorrências de 1-5101S, 1-6101S, 1-6933S, 1-1201E, 1-2201; podem ter lançamentos válidos.

## Atualização: De/Para conta + centro de custos
Caminho preferencial agora: `bi_dre_depara_conta_ccu` (ver `mem/features/dre-depara-conta-ccu.md` e `/bi/contabilidade/dre/parametrizacao`). Drill do `LANCAMENTO` traz botão "Criar regra" (Wand2) que abre `DreCriarRegraDeparaModal`. Exceção por lançamento (`bi_dre_excecoes`) fica para casos pontuais e raros que não cabem em regra por conta+centro.
