## Objetivo

Ajustar `src/pages/rh/ResumoFolhaPage.tsx` e `src/lib/rh/api.ts` para que a tela **RH · 01 — Resumo Folha** consuma exclusivamente `/api/rh/resumo-folha/dashboard` (ERP Senior/Vetorh), sem qualquer cálculo local nem acesso ao backend Lovable Cloud.

## Mudanças

### 1. `src/lib/rh/api.ts`
- `fetchResumoFolhaDashboard`: sempre enviar `modo=completo` (novo default), substituindo `acumulado`/`mensal`. Assinatura passa a aceitar `modo?: "completo" | "acumulado" | "mensal"` com default `"completo"`.
- `normalizeDashboard`:
  - Propagar `response.fonte` e o objeto `diagnostico` completo (incluindo `fonte_cards`, `vm_folha_status`, `vm_folha_componentes`, `erro_tecnico`, `qtd_linhas`, `anomes_ini`, `anomes_fim`).
  - Preservar `qtd_horas` / `qtd_hora_extra` como string sempre (nunca converter para número, mesmo se vier numérico → manter como string tal como retornado).
  - Não preencher KPI ausente com 0: manter mecanismo atual `_missing_kpis` (o front já mostra "Campo não retornado pela API").
- `sincronizarResumoFolha` novo: tenta `POST /api/rh/resumo-folha/sincronizar?...`; em 404/405 faz fallback para `POST /api/rh/vm-folha/sincronizar?...`. Mesmos parâmetros (`codemp`, `anomes_ini`, `anomes_fim`).
- Remover qualquer utilitário residual usado apenas para somar/agregar no front.

### 2. `src/pages/rh/ResumoFolhaPage.tsx`
- Remover o toggle "Acumulado/Mensal" e a segunda query em `modo=mensal`. Passa a existir **uma única query** com `modo=completo`.
- Cards: mapear 1:1 `response.kpis.*` conforme lista solicitada. Manter `ValueOrMissing` para exibir "Campo não retornado pela API" quando ausente/`null`/`"campo_pendente"`. `R$ 0,00` só quando o valor for numericamente `0`.
- Grid por filial: renderizar exatamente as colunas listadas na ordem pedida, sem footer de somatório. `qtd_horas` e `qtd_hora_extra` exibidos como texto puro (sem `formatHoras`/parse).
- Série mensal / gráfico: continuar consumindo `response.mensal` da mesma resposta (quando presente); nenhum outro fetch.
- Drills (`proventos_vantagens`, `descontos`, `tipos_evento`): puramente analíticos, já não alimentam KPI.
- Aviso abaixo dos cards: trocar texto atual por  
  **"Indicadores oficiais retornados pela API a partir do ERP Senior/Vetorh."**
- Botão **Sincronizar RH**: chamar novo `sincronizarResumoFolha` (com fallback). Sucesso → toast "Sincronização RH concluída." + invalidar/refetch da query do dashboard. Erro → toast "Erro ao sincronizar dados do ERP Senior/Vetorh."
- Área **Diagnóstico Técnico** (somente admin, via `useUserPermissions`): exibir, quando presentes, `response.fonte`, `diagnostico.fonte_cards`, `vm_folha_status`, `vm_folha_componentes`, `erro_tecnico`, `qtd_linhas`, `anomes_ini`, `anomes_fim`. Manter CTA "Sincronizar agora" quando `qtd_linhas === 0` ou dashboard totalmente vazio.
- Confirmar ausência total de imports de `@/integrations/supabase/client` e de qualquer soma local para os cards/grid.

### 3. Documentação
- `docs/backend-rh-resumo-folha-dashboard.md`: registrar `modo=completo` como o modo consumido pela tela, o endpoint preferencial `POST /api/rh/resumo-folha/sincronizar` (com fallback `vm-folha/sincronizar`), e os novos campos de diagnóstico (`fonte`, `diagnostico.fonte_cards`, `diagnostico.erro_tecnico`, `diagnostico.qtd_linhas`, `diagnostico.anomes_ini/fim`).

## Fora do escopo
- Backend/edge functions (nenhuma alteração).
- Outras telas do módulo RH.
- Alterações visuais fora do necessário para remover o toggle e ajustar textos/colunas.
