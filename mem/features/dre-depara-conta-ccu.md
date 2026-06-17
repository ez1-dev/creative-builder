---
name: dre-depara-conta-ccu
description: Tabela bi_dre_depara_conta_ccu (Cloud) classifica DRE por conta contábil + centro de custos; "TODAS" representa regra geral; tem prioridade sobre bi_dre_mascara mas perde para classificações/exceções específicas
type: feature
---

- Tabela `public.bi_dre_depara_conta_ccu`: `(cd_conta_contabil, cd_centro_custos) → cd_mascara_dre`. `cd_centro_custos = 'TODAS'` = regra geral; específica vence sobre TODAS.
- Tela admin: `/bi/contabilidade/dre/parametrizacao` (`DreParametrizacaoPage`). RLS: select para qualquer authenticated; insert/update/delete restrito a admin via `is_admin(auth.uid())`.
- API frontend: `src/lib/bi/dreDeparaApi.ts` (CRUD direto via supabase-js). Constantes em `src/lib/bi/dreDepara.ts` (`DRE_MASCARAS_DEPARA`, 9 opções; `CENTRO_CUSTOS_TODAS`).
- Drill DRE: botão **Criar regra** (Wand2) ao lado de Exceção/Classificar abre `DreCriarRegraDeparaModal` pré-preenchido com conta, centro, máscara atual, histórico, valor. Checkbox "Aplicar a todos os centros" grava `TODAS`.
- Backend (FastAPI/RPC) — spec em `docs/backend-bi-contabilidade-dre-depara.md`. Prioridade ao montar DRE: classificacoes > excecoes > depara exato > depara TODAS > bi_dre_mascara > NAO_CLASSIFICADO.
- Preferir de/para conta+centro a exceção por lançamento; exceção fica para casos pontuais e raros.
