## Objetivo
Ajustes visuais em `src/pages/rh/ResumoFolhaPage.tsx`. Sem mudanças em API, cálculos ou backend.

## Mudanças

1. **Badge "Em validação técnica" no card Custo das Férias**
   - Condição: `isAdmin` **e** `dashboard.fonte === "public.rh_vm_folha"`.
   - Renderizar legenda discreta abaixo do valor (`text-xs text-muted-foreground`), texto exato `Em validação técnica`.
   - Não afeta o estado "Campo pendente na API" quando `custo_ferias` vier `null`.

2. **Rótulo da fonte técnica**
   - Onde hoje aparece `Fonte: public.rh_vm_folha` (bloco Diagnóstico Técnico / rodapé), trocar por `Fonte: API RH / cache técnico public.rh_vm_folha` quando `dashboard.fonte === "public.rh_vm_folha"`.
   - Outros valores de `fonte` mantêm `Fonte: {dashboard.fonte}`.

## Fora de escopo
- Mapeamento de KPIs (`provento`, `desconto`, `total_liquido`, `inss_total`, `hora_extra`, `provisoes`, `custo_ferias`, `fgts`, e os pendentes `custo_total`, `beneficios`, `rescisoes`) permanece inalterado.
- Nenhuma alteração em `src/lib/rh/api.ts`, sync, polling, endpoints, Cloud ou docs.

## Verificação
- Admin com `fonte = public.rh_vm_folha`: badge aparece só no card Custo das Férias; rodapé/diagnóstico mostra `Fonte: API RH / cache técnico public.rh_vm_folha`.
- Não-admin: badge oculto; demais cards inalterados.
