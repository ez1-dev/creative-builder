## Contexto

A tela `/rh/resumo-folha` já consome `GET /api/rh/resumo-folha/dashboard?...&modo=completo` e não faz cálculos no front. Os ajustes pedidos são de fonte de sincronização, textos e polling.

## Mudanças

### 1. `src/lib/rh/api.ts`
- Trocar o endpoint preferencial de sync para `POST /api/rh/vm-folha-compat/sincronizar?codemp=&anomes_ini=&anomes_fim=` (o que existe hoje).
- Manter fallback para `/api/rh/vm-folha/sincronizar` e `/api/rh/resumo-folha/sincronizar` (404/405) só como retaguarda.
- A resposta pode vir com `{ status: "EM_PROCESSAMENTO", job_id?, ...}` ou `{ status: "OK" }`. Propagar esse objeto sem alteração.
- Adicionar `consultarStatusSincronizacaoRh({ codemp, job_id? })` chamando `GET /api/rh/vm-folha-compat/sincronizar/status?...`; se retornar 404, o hook desliga o polling silenciosamente.

### 2. `src/pages/rh/ResumoFolhaPage.tsx`
- Botão "Sincronizar RH":
  - onClick chama `sincronizarResumoFolha` novo (vm-folha-compat).
  - Se resposta `status === "EM_PROCESSAMENTO"` → manter `syncing=true`, iniciar `useQuery` de status a cada 5s (via `refetchInterval`). Botão fica desabilitado e mostra `Loader2` + "Sincronizando...".
  - Ao chegar `status === "OK"` (ou 404 no status endpoint) → parar polling, `toast.success("Sincronização RH concluída.")`, `invalidateQueries(["rh","resumo-folha-dashboard"])`.
  - Em erro → `toast.error("Erro ao sincronizar dados do ERP Senior/Vetorh.")`; para admin, mostrar `response.diagnostico.erro_tecnico` no toast description.
- Aviso abaixo dos cards: trocar texto atual por exatamente `"Indicadores retornados pela API a partir das tabelas oficiais do ERP Senior/Vetorh."` (remover menção a "VM_FOLHA").
- Estado "sem dados": remover o texto "Base oficial VM_FOLHA ainda não sincronizada" — trocar por `"Sem dados retornados pela API para o período selecionado."` e manter CTA "Sincronizar agora".
- Bloco "Componentes VM_FOLHA não localizados" → renomear label para `"Componentes não localizados pela API:"` (mantém a lista de `diagnostico.componentes_pendentes`).
- Diagnóstico Técnico (admin): manter como está; só adicionar linha `status_sincronizacao` quando o polling estiver ativo.

### 3. Documentação
- Atualizar `docs/backend-rh-resumo-folha-dashboard.md`:
  - Registrar que a `VM_FOLHA` é um objeto lógico do UpQuery, não uma tabela física; o backend deve montar os KPIs a partir das tabelas oficiais do ERP Senior/Vetorh (R034FUN, R038HTR, R044RHR, etc.) na resposta do endpoint dashboard.
  - Sync oficial: `POST /api/rh/vm-folha-compat/sincronizar` (com opcional `GET /api/rh/vm-folha-compat/sincronizar/status` para polling), com fallback documentado para `/vm-folha/sincronizar`.
  - Frontend nunca consulta Supabase nem `public.rh_vm_folha`.

## Regras respeitadas

- Nenhum cálculo no front (KPIs e grid renderizam somente `response.kpis` / `response.filiais`).
- Campo ausente vira "Campo não retornado pela API: X" (já implementado via `ValueOrMissing` / `KpiOrMissing`).
- `R$ 0,00` só aparece quando a API devolve `0` explicitamente.
- Sem chamadas a Supabase ou `rh_vm_folha`.

## Fora de escopo

- Alterar o layout dos KPIs ou colunas do grid (já batem com o mapeamento pedido).
- Refazer gráficos de evolução mensal (dependem de `response.mensal`, que continua opcional).
