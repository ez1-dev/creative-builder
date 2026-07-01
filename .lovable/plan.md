## Diagnóstico

O mapeamento em `src/lib/rh/api.ts` (`KPI_ALIASES` + `buildKpis`) já lê `response.kpis.inss_total`, `response.kpis.provisoes` e `response.kpis.fgts` diretamente, sem cálculo no front. A `ResumoFolhaPage.tsx` já renderiza esses três via `KpiOrMissing`, que só mostra "Campo pendente na API" quando o valor vem `null`/ausente e nunca converte `null` em `R$ 0,00`.

Ou seja, com o payload atual da API (`inss_total = 3.147.066,97`, `provisoes = 2.735.803,41`, `fgts = 840.274,75`) os três cards devem exibir os valores automaticamente, e `custo_total`, `beneficios` e `rescisoes` continuam mostrando "Campo pendente na API" enquanto retornarem `null`.

## Ação proposta

1. Abrir `/rh/resumo-folha` no preview com Jan–Mai/2026 (`anomes_ini=202601&anomes_fim=202605&codemp=1`) e conferir no console o log `[RH ResumoFolha] dashboard` — validar:
   - `kpis_raw.inss_total / provisoes / fgts` chegam preenchidos.
   - `kpis_normalizados` reflete os mesmos números.
   - `_missing_kpis` contém apenas `custo_total`, `beneficios`, `rescisoes`.
2. Se algum dos três aparecer como "Campo pendente na API" mesmo com o valor vindo no payload:
   - Investigar se a resposta real usa outra chave (ex.: `inss`, `vl_inss`, `provisao_total`, `fgts_total`) e acrescentar o alias em `KPI_ALIASES` no `src/lib/rh/api.ts` — nada de cálculo local, apenas leitura direta.
3. Se os três já renderizarem corretamente, nenhuma alteração de código é necessária; encerrar confirmando ao usuário.

Nenhuma mudança em Supabase, nenhum cálculo no front, `null` continua exibindo "Campo pendente na API".