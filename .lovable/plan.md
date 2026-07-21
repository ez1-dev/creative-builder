## Objetivo
Remover a coluna "Acumulado" da grid quando o modelo for **Balanço**. Manter apenas na DRE.

## Alteração
Arquivo: `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`

- `colunasGrid`: só anexa `"ACUMULADO_ANO"` quando `!isBalanco`.
  ```ts
  const colunasGrid = useMemo(
    () => (!isBalanco && colunasVisiveis.length > 0
      ? [...colunasVisiveis, "ACUMULADO_ANO"]
      : colunasVisiveis),
    [colunasVisiveis, isBalanco],
  );
  ```
- Como a coluna deixa de ser renderizada no Balanço, as ramificações `isBalanco` dentro de `calcAcumuladoAno`, header/tooltip e drill viram código morto — posso simplificar removendo as labels condicionais `isBalanco ? "Saldo final do período" : "Acumulado"`.

## Validação
- Abrir um modelo **Balanço** → grid mostra apenas meses + "Saldo final visível" (sem "Acumulado").
- Abrir um modelo **DRE** → coluna "Acumulado" continua no final, respondendo ao filtro de meses.