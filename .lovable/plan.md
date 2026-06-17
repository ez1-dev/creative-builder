## Objetivo
Garantir que o drill da DRE Contábil envie sempre o `codigo_linha` técnico (nunca `descricao`/`mascara`/label) e que linhas TOTAL/CÁLCULO abram REABRIR antes de permitir HISTORICO.

## Diagnóstico
- `src/pages/bi/contabilidade/DrePage.tsx` já lê `l.codigo_linha` para chamar `abrirDrill(codLinha, ...)`. Bom.
- Falta: log de diagnóstico antes da chamada, validação de `codigo_linha` ausente, e gate para `tipo_linha` ∈ {TOTAL, CALCULO} forçar REABRIR.
- `src/lib/bi/dreDrillApi.ts` monta a URL com `params.codigo_linha`. Falta validação explícita + logs detalhados da linha.
- `DreDrillRow` no drawer (componentes do REABRIR) precisa propagar `codigo_linha` para o push subsequente (hoje usa `row.chave`, que já é o código — manter).

## Mudanças

### 1) `src/lib/bi/dreDrillApi.ts`
- Antes de montar `URLSearchParams`, validar:
  ```ts
  const codigoLinha = params.codigo_linha;
  if (!codigoLinha) {
    console.error('[DRE DRILL] Linha sem codigo_linha:', params);
    throw new Error('Linha da DRE sem código técnico para drill.');
  }
  ```
- Logs adicionais:
  ```ts
  console.log('[DRE DRILL] codigo_linha enviado:', codigoLinha);
  console.log('[DRE DRILL] tipo_drill:', tipoDrillFinal);
  console.log('[DRE DRILL] anomes_referente:', params.anomes_referente ?? '(vazio - total anual)');
  ```
- Não enviar `anomes_referente` quando vazio (omitir do `URLSearchParams` ao invés de `=''`) — evita ruído no backend.

### 2) `src/pages/bi/contabilidade/DrePage.tsx`
- Estender `DreLinha` com `tipo_linha?: string`.
- Em `abrirDrill`, receber a linha completa (ou `tipo_linha` opcional) e logar:
  ```ts
  console.log('[DRE DRILL] linha selecionada:', l);
  console.log('[DRE DRILL] codigo_linha enviado:', l.codigo_linha);
  console.log('[DRE DRILL] mascara exibida:', l.descricao);
  console.log('[DRE DRILL] tipo_linha:', l.tipo_linha);
  ```
- Regra TOTAL/CALCULO: se `tipo_linha ∈ {TOTAL, CALCULO}` **ou** `isLinhaCalculada(codigo)` for verdadeiro e o usuário escolheu `HISTORICO`/`LANCAMENTO`/`CONTA_CONTABIL`/etc., forçar `REABRIR` e mostrar toast: "Linha calculada — abrindo componentes da fórmula. Detalhe um componente para ver HISTORICO."
- No `onDoubleClick`, mesma regra: se calculada/total → `REABRIR`, senão `LANCAMENTO`.
- Passar `codigo_linha` (não `descricao`/`mascara`) — já correto, manter explicitamente comentado.

### 3) `src/components/bi/contabilidade/DreDrillDrawer.tsx`
- Em `drillEmComponente(cod)`, manter uso de `row.chave` (é o código técnico do componente). Adicionar log:
  ```ts
  console.log('[DRE DRILL] drill em componente REABRIR:', cod);
  ```

## Fora de escopo
- Backend (nomes de `tipo_linha`, RPC de drill).
- Exceções / classificação / regras De-Para.
- Outras telas BI.

## Validação
- Clicar com botão direito em "(-) Deduções s/vendas" → Histórico: URL deve conter `codigo_linha=DEDUCOES_VENDAS` (verificar console).
- Clicar em "Lucro Bruto" → drill abre REABRIR automaticamente, ainda que usuário tenha pedido HISTORICO.
- Coluna mensal envia `anomes_referente=YYYYMM`; coluna TOTAL não envia o parâmetro.