---
name: DRE — Classificação assistida e exceções
description: Drill DRE permite marcar exceção (escopo lançamento) e classificar lançamentos em 4 escopos (LANCAMENTO, DOCUMENTO, COMBINACAO, REGRA_DEFINITIVA) com simulação de impacto e fila de aprovação para regras definitivas
type: feature
---
- Drill da DRE em `LANCAMENTO` mostra dois botões por linha: "Exceção" (legado, escopo lançamento) e "Classificar" (novo, 4 escopos).
- Modal `DreClassificarModal` exibe os campos do lançamento, permite escolher linha destino (13 opções), escopo, motivo, e simular impacto antes de salvar.
- Tabela Cloud `bi_dre_classificacoes` (enums `dre_classificacao_escopo` e `dre_classificacao_status`); apenas admin aprova/rejeita.
- Endpoints FastAPI: `POST /api/bi/contabilidade/dre-classificar-lancamento` e `/dre-classificar-simular`. Especificação em `docs/backend-bi-contabilidade-dre-classificar.md`.
- Fallback automático: se o endpoint FastAPI não estiver disponível, o frontend grava direto na tabela Cloud (para escopo amplo, ainda precisa do backend para refletir na matriz).
- Página `/bi/contabilidade/dre/aprovacoes` lista pendentes e histórico; aprovar/rejeitar atualiza status e auditor.
- Regras definitivas só passam a vigorar com `status='APROVADO'`. Nada de regra geral por TNS sem confirmação.
