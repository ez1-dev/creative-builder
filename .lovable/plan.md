# Quebra por operação na Impressão de OP

Adicionar a opção `quebrar_por_operacao` (S/N) que repete o cabeçalho/componentes/rodapé da OP para cada operação, gerando uma página A4 por operação. Funciona tanto na impressão individual quanto no lote ("Imprimir todas" / "Imprimir selecionadas").

## Mudanças

### 1. `src/lib/producao/opImpressao.ts`
- Adicionar `quebrar_por_operacao?: 'S' | 'N' | ''` em `ImpressaoOpFiltros`.
- Adicionar `proxima_operacao_label?: string` em `OpOperacao` (campo opcional vindo da API; sem cálculo no frontend).

### 2. `src/hooks/useImpressaoOrdemProducao.ts`
- Enviar sempre `quebrar_por_operacao` (`'S'` ou `'N'`) na query da chamada individual.

### 3. `src/lib/producao/opImpressaoLote.ts`
- Adicionar `quebrar_por_operacao?: 'S' | 'N'` em `ImpressaoOpLoteParams` e enviar como `quebrar_por_operacao=S|N` na query.

### 4. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Em `EMPTY`, incluir `quebrar_por_operacao: 'N'`.
- Adicionar checkbox no grupo "Refinamento" (perto de "Incluir desenhos"): **"Quebrar uma página por operação / centro de recurso"**.
- Em `imprimirTodas` e `imprimirSelecionadas`, propagar `quebrar_por_operacao`. Em `imprimirSelecionadas`, incluir no payload de cada GET individual.
- Quando a opção estiver marcada, exibir aviso visível (acima do preview / no header da página de preview): **"Modo ativo: será impressa uma página por operação."**
- Reset/`limpar` zera para `'N'`.

### 5. `src/components/producao/OpPrintSheet.tsx`
- Aceitar nova prop `quebrarPorOperacao?: boolean`.
- Refatorar para extrair o conteúdo de uma página completa (título + cabeçalho + componentes + bloco "Operações" + responsabilidade + rodapé) em um sub-render que aceita um array de operações.
- Quando `quebrarPorOperacao = false`: comportamento atual (uma página com todas as operações).
- Quando `quebrarPorOperacao = true`:
  - Se `operacoes.length === 0`: renderizar mensagem **"Nenhuma operação encontrada para os filtros selecionados."** e não emitir páginas.
  - Caso contrário: renderizar 1 `.op-print-page.operation-single-page` por operação, cada uma com cabeçalho, REV, agrupamento, código de barras, componentes, apenas aquela operação (com sua tabela manual de apontamento), mensagem de responsabilidade e rodapé.
- Para "Próx. Oper.", usar exclusivamente `op.proxima_operacao_label` (não calcular nada no frontend). Remover o `opPorCodigo` Map.
- Desenhos (quando houver) continuam renderizando após a última página de operação da OP.

### 6. `src/components/producao/OpPrintBatch.tsx`
- Aceitar e propagar `quebrarPorOperacao` para cada `OpPrintSheet`. O wrapper `op-print-page` externo continua dando `page-break-after` entre OPs; quando há quebra interna por operação, cada operação já será sua própria página A4.

### 7. `src/components/producao/op-print.css`
- Adicionar/garantir:
  ```css
  .op-print-page {
    width: 210mm;
    min-height: 297mm;
    page-break-after: always;
    break-after: page;
  }
  .op-print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .operation-single-page {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  ```

## Fora de escopo
- Cálculo de `proxima_operacao_label` no frontend (vem da API).
- Mudanças no backend (a API já aceita `quebrar_por_operacao` conforme descrito).
- Alteração na lógica de filtragem por Origem / Pedido / Centro de Recurso (mantida).
