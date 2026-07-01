## Objetivo
Alinhar `src/pages/rh/ResumoFolhaPage.tsx` 100% ao contrato do endpoint `/api/rh/resumo-folha/dashboard`, sem cálculos no front, e corrigir o erro de runtime `totalProvento is not defined`.

## Mudanças

### 1. `src/pages/rh/ResumoFolhaPage.tsx`
- **Corrigir runtime error**: remover qualquer referência remanescente a `totalProvento` / `totalDesconto` / `totMensal` (footers ou sums) que ficou órfã e está quebrando a página.
- Garantir que **nenhum** `reduce`/soma alimente cards. Manter apenas o `reduce` do `tiposPie` (uso puramente visual do gráfico de pizza — percentual de fatia, não KPI).
- Cards já usam `kpis.*` com `ValueOrMissing` / `KpiOrMissing` — manter. Confirmar que `R$ 0,00` só aparece quando o backend retornar explicitamente `0` (a flag `_missing_kpis` já cuida disso via `pickKey` em `api.ts`).
- Aviso abaixo dos cards: trocar texto atual para exatamente **"Indicadores oficiais calculados pela API com base na VM_FOLHA/RH."**
- Bloco **Diagnóstico Técnico** (admin): adicionar `vm_folha_componentes` como primeiro item da lista de chaves exibidas.
- Grid Filial: já mapeia todas as colunas pedidas; manter `qtd_horas` / `qtd_hora_extra` como texto (já ok).
- "Sincronizar RH": o `RhPageHeader` já invalida `["rh", ...]`, o que refaz o `useQuery` do dashboard — nada a mudar.

### 2. Nenhuma alteração em `src/lib/rh/api.ts` ou `types.ts`
Contrato e normalização já atendem: consumo direto de `kpis`, `filiais`, `proventos_vantagens`, `descontos`, `tipos_evento`, `diagnostico`/`debug`, com `_missing_kpis` para distinguir campo ausente de zero explícito.

## Fora de escopo
Backend / VM_FOLHA / composição dos KPIs (responsabilidade da API).
