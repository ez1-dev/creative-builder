## Objetivo

Atualizar a tela "01 — Resumo da Folha" (`src/pages/rh/ResumoFolhaPage.tsx`) para consumir fielmente o novo contrato de `GET /api/rh/resumo-folha/dashboard`, sem recalcular nada no frontend, adicionando os novos KPIs `va` e `outras_gratificacoes`, renomeando visualmente `INSS Total`, e tratando corretamente valores nulos como "Pendente".

## Escopo (somente frontend)

Arquivos afetados:
- `src/lib/rh/types.ts` — tipagem dos KPIs
- `src/lib/rh/api.ts` — normalização/aliases dos KPIs e filiais
- `src/pages/rh/ResumoFolhaPage.tsx` — cards e ordenação
- `src/components/rh/KpiOrMissing.tsx` — suporte a estado "Pendente" (valor nulo) e tooltip

Nada de backend, ETL, RLS, view `rh_drill_eventos_v` ou cálculos.

## Alterações detalhadas

### 1. Tipos (`src/lib/rh/types.ts`)
Ampliar `ResumoFolhaKpis` deixando todos os campos numéricos como `number | null` opcionais e adicionando `va` e `outras_gratificacoes`. Adicionar também `kpis_status` e `kpis_completude` opcionais em `ResumoFolhaDashboard` (sem tipar rígido — reaproveitar o que a API mandar). Adicionar `va` como `number | null` também em `ResumoFolhaFilialAgg` (já existe, ajustar o tipo).

### 2. Normalização (`src/lib/rh/api.ts`)
- Em `KPI_ALIASES`, adicionar `va: ["va"]` e `outras_gratificacoes: ["outras_gratificacoes"]`.
- Em `buildKpis`, preservar `null` sem sobrescrever para `0`: quando o campo estiver ausente, marcar como `_missing_kpis` (mantendo comportamento atual); quando vier explicitamente `null`, gravar `null` no objeto de KPIs (não marcar como missing — é um "Pendente" oficial).
- Remover o alias cruzado atual `va ↔ beneficios` em `normalizeFiliais` (linhas 199–200) para não duplicar V.A. em Benefícios das filiais.
- Propagar `kpis_status` e `kpis_completude` da resposta bruta para o objeto `ResumoFolhaDashboard`.

### 3. Componente `KpiOrMissing`
- Aceitar `value: number | null | undefined`.
- Regra de renderização:
  - Se `missing === true` (campo ausente do payload) → badge atual "Campo pendente na API".
  - Se `value == null` → badge `Pendente` (variant `outline`), sem exibir `R$ 0,00`.
  - Caso contrário → `formatCurrency(value)`.
- Aceitar um `tooltip?: string` opcional exibido via `Tooltip` do shadcn no título do card.

### 4. Página `ResumoFolhaPage.tsx`
Substituir o bloco `kpis-resumo` para renderizar os cards na ordem sugerida, preservando o card composto "Líquido" (Provento/Desconto/Total Líquido) e os KPIs que já existem e não foram mencionados (Hora Extra, Provisões, Custo das Férias, Custo Total):

Ordem:
1. Líquido (card composto atual — preservado)
2. Salário Base
3. Salário Bruto
4. Outras Gratificações — `kpis.outras_gratificacoes` (novo)
5. Benefícios — com tooltip "Benefícios oficiais do período, incluindo V.A."
6. V.A. — `kpis.va` (novo); nulo → badge "Pendente"
7. INSS (descontos) — mesmo campo `kpis.inss_total`, apenas título e tooltip "Descontos de INSS dos colaboradores. Não representa GPS patronal."
8. FGTS
9. Rescisões — tooltip "Custo de rescisões calculado pelos eventos oficiais da folha."
10. Custo Total
11. Hora Extra, Provisões, Custo das Férias (preservados após o bloco principal)

Não somar `beneficios + va` em nenhum lugar. Não converter `null` para `0` (remover usos de `?? 0` para exibição — a formatação é feita pelo componente).

### 5. Cache
- Após ações de sincronização (já existentes) e no primeiro mount pós-deploy, invalidar:
  ```ts
  qc.invalidateQueries({ queryKey: ["rh", "resumo-folha"] });
  qc.invalidateQueries({ queryKey: ["rh", "resumo-folha-dashboard"] });
  ```
  Adicionar um `useEffect` único, guardado por flag em `sessionStorage` (`rh-resumo-folha-invalidated-v2`), para invalidar uma vez após a subida do novo contrato.

### 6. Grid de filiais
Consumir `va` do backend como está retornado (coluna V.A. já existe). Não distribuir/soma V.A. no frontend. Já removido o cross-alias no passo 2.

## Fora de escopo (não alterar)
Backend, banco, view, sync, autenticação, endpoint, cálculos, cards não mencionados. Nenhuma lista de códigos de evento no frontend (auditar e confirmar que não existe).

## Validação

Fevereiro/2026 (`anomes_ini=202602`, `anomes_fim=202602`, `codemp=1`):
- V.A. = R$ 263.704,99
- Rescisões = R$ 201.150,35
- Benefícios = R$ 379.494,34 (já inclui V.A.)
- Card `INSS (descontos)` visível
- V.A. nulo em meses de transição → badge "Pendente", sem `R$ 0,00`
- `kpis_status`/`kpis_completude` continuam refletindo Completo/Parcial/Pendente
