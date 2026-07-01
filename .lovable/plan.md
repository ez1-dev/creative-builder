## Objetivo

Ajustes visuais na tela `/rh/resumo-folha` (`src/pages/rh/ResumoFolhaPage.tsx`). Nenhum cálculo no front, nenhuma leitura direta do backend/Cloud, nenhum `null → R$ 0,00`. O mapeamento atual dos KPIs em `src/lib/rh/api.ts` já está correto e não muda.

## Mudanças

1. **Card "Custo das Férias" — aviso "Em validação técnica"**
   - Onde: bloco do KPI `custo_ferias` em `ResumoFolhaPage.tsx`.
   - Condição: `dashboard.fonte === "public.rh_vm_folha"` **e** usuário admin (mesmo gate já usado hoje para o bloco "Diagnóstico Técnico").
   - Render: badge/legenda discreta abaixo do valor, com texto exatamente `Em validação técnica` (estilo `text-xs text-muted-foreground`, sem cor de alerta forte).
   - Não afeta a renderização quando o valor vier `null` — nesse caso o `KpiOrMissing` continua mostrando "Campo pendente na API".

2. **Rótulo da fonte técnica**
   - Onde: local(is) em `ResumoFolhaPage.tsx` que hoje renderizam `Fonte: public.rh_vm_folha` (bloco de diagnóstico e/ou rodapé técnico).
   - Trocar a montagem do texto para: `Fonte: API RH / cache técnico public.rh_vm_folha` quando `dashboard.fonte === "public.rh_vm_folha"`. Para outros valores de `fonte`, manter o texto atual (`Fonte: {dashboard.fonte}`).

## Fora de escopo (confirmação)

- KPIs mantidos exatamente como estão hoje: `provento`, `desconto`, `total_liquido`, `inss_total`, `hora_extra`, `provisoes`, `custo_ferias`, `fgts` renderizam o valor da API; `custo_total`, `beneficios`, `rescisoes` seguem em "Campo pendente na API" enquanto vierem `null`.
- Nenhuma mudança em `src/lib/rh/api.ts`, `KPI_ALIASES`, `buildKpis`, sync ou polling.
- Nenhuma alteração em endpoints, Cloud/Supabase, migrations ou docs de backend.

## Verificação

- Abrir `/rh/resumo-folha` como admin com `fonte = public.rh_vm_folha` e conferir: badge "Em validação técnica" aparece somente no card Custo das Férias; rodapé/diagnóstico mostra `Fonte: API RH / cache técnico public.rh_vm_folha`.
- Como usuário não-admin: badge não aparece; demais cards inalterados.
