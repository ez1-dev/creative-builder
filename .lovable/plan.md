## Objetivo

Padronizar o valor enviado em `tipo_drill` para `GET /api/bi/contabilidade/dre-drill`, eliminando qualquer chance de mandar label ("Centro de Custos", "Conta Contábil", "Detalhe"…), `undefined` ou `null`. Os valores aceitos passam a ser:

`CENTRO_CUSTOS | CONTA_CONTABIL | HISTORICO | LANCAMENTO | ORIGEM | TRANSACAO | UNIDADE | REABRIR`

> Atenção: hoje o frontend e o doc do backend usam `CENTRO_CUSTO` (sem S) e `CONTA`. Esta mudança renomeia para `CENTRO_CUSTOS` e `CONTA_CONTABIL` conforme pedido. **O backend FastAPI / RPC `bi_dre_drill_realizado` precisa aceitar os novos nomes** — senão o drill volta vazio. Vou atualizar o doc `docs/backend-bi-contabilidade-dre-drill.md` avisando.

## Mudanças

### 1. `src/lib/bi/dreDrillApi.ts`
- Adicionar:
  ```ts
  export const DRE_DRILL_TYPES = {
    CENTRO_CUSTOS: 'CENTRO_CUSTOS',
    CONTA_CONTABIL: 'CONTA_CONTABIL',
    HISTORICO: 'HISTORICO',
    LANCAMENTO: 'LANCAMENTO',
    ORIGEM: 'ORIGEM',
    TRANSACAO: 'TRANSACAO',
    UNIDADE: 'UNIDADE',
    REABRIR: 'REABRIR',
  } as const;
  export type DreDrillTipo = keyof typeof DRE_DRILL_TYPES;

  export function normalizeDreDrillType(value?: string): DreDrillTipo {
    const allowed = Object.keys(DRE_DRILL_TYPES);
    const normalized = String(value || 'CONTA_CONTABIL').trim().toUpperCase();
    return (allowed.includes(normalized) ? normalized : 'CONTA_CONTABIL') as DreDrillTipo;
  }
  ```
- Atualizar `DRE_DRILL_LABELS` para as novas chaves (`CENTRO_CUSTOS`, `CONTA_CONTABIL`, demais inalteradas).
- Em `fetchDreDrill`:
  ```ts
  const tipoDrillFinal = normalizeDreDrillType(params.tipo_drill);
  params.set('tipo_drill', tipoDrillFinal);  // via URLSearchParams existente
  console.log('[DRE DRILL] tipo_drill enviado:', tipoDrillFinal);
  console.log('[DRE DRILL] params:', Object.fromEntries(qs.entries()));
  ```
  Mantém `codigo_linha`, `ano`, `mes_ini`, `mes_fim`, `anomes_referente`, `unidade`.

### 2. `src/pages/bi/contabilidade/DrePage.tsx`
- Linhas 608–609 (menu de drill): trocar
  - `'CENTRO_CUSTO'` → `'CENTRO_CUSTOS'`
  - `'CONTA'` → `'CONTA_CONTABIL'`
- Abertura padrão da linha (chamada `drill.openWith`, ~linha 247): garantir `tipo_drill: 'CONTA_CONTABIL'` quando for clique simples na linha (hoje envia o tipo selecionado; manter, mas default = `CONTA_CONTABIL`).

### 3. `src/components/bi/contabilidade/DreDrillDrawer.tsx`
- Linha 83: `tipo_drill: 'CONTA'` → `'CONTA_CONTABIL'` (somatório de componentes do REABRIR).
- Demais usos (`'REABRIR'`, `'LANCAMENTO'`) continuam válidos.

### 4. `docs/backend-bi-contabilidade-dre-drill.md`
- Adicionar nota: valores aceitos passam a ser `CENTRO_CUSTOS`, `CONTA_CONTABIL`, `HISTORICO`, `LANCAMENTO`, `ORIGEM`, `TRANSACAO`, `UNIDADE`, `REABRIR`. Atualizar a tabela de `GROUP BY` para refletir os novos nomes — backend precisa mapear na RPC.

## Fora de escopo
- Não mexer em `bi_dre_regras`, `bi_dre_mascara`, nem na DRE-matriz.
- Sem alteração no fluxo de exceções.
