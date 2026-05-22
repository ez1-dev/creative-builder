## Objetivo

Quando "Imprimir desenhos da OP" estiver marcado e a OP não tiver desenho, inserir uma **página branca técnica** no lugar do desenho, preservando a sequência física da impressão (OP na frente, desenho/página reservada depois).

## Mudanças

### 1. `src/components/producao/OpPrintSheet.tsx`
- Adicionar nova prop opcional `imprimirDesenhos?: boolean | null` em `Props`.
- Criar componente interno `MissingDrawingPage` que renderiza uma página A4 com classe `op-print-unit op-missing-drawing-page` e label discreto no rodapé: "Desenho não encontrado para esta OP".
- Nos 3 pontos onde hoje aparece `{desenhos.length > 0 && renderDesenhos(...)}` (linhas ~487, ~510, ~532 nos três modos de renderização), acrescentar logo após:
  ```tsx
  {imprimirDesenhos && desenhos.length === 0 && paginasDesenhosA4?.length === 0 && <MissingDrawingPage />}
  ```
- Em preview, manter o aviso atual de "Nenhum desenho encontrado…" (não duplicar). A `MissingDrawingPage` só sai em fluxo de impressão (sem condicional `preview`, pois ela respeita as quebras `op-print-unit` e também aparece na visualização para o operador conferir).

### 2. `src/components/producao/OpPrintBatch.tsx`
- Adicionar prop `imprimirDesenhos?: boolean | null` em `Props`.
- Repassar para cada `<OpPrintSheet ... imprimirDesenhos={imprimirDesenhos} />`.

### 3. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Nas chamadas a `<OpPrintBatch ... />` (lote e individual via `OpPrintSheet`), passar:
  ```tsx
  imprimirDesenhos={filtros.incluir_desenhos === 'S'}
  ```

### 4. `src/components/producao/op-print.css`
- Acrescentar no final:
  ```css
  .op-missing-drawing-page {
    width: 190mm;
    height: 281mm;
    min-height: 281mm;
    max-height: 281mm;
    box-sizing: border-box;
    background: #fff;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0 0 8mm 0;
    overflow: hidden;
  }

  .op-missing-drawing-label {
    font-family: Arial, "Helvetica Neue", sans-serif;
    font-size: 7pt;
    color: #999;
    font-style: italic;
    text-align: center;
  }

  @media print {
    .op-missing-drawing-page {
      width: 190mm !important;
      height: 281mm !important;
      min-height: 281mm !important;
      max-height: 281mm !important;
      background: #fff !important;
      overflow: hidden !important;
    }
    .op-missing-drawing-label {
      font-size: 7pt !important;
      color: #999 !important;
      font-style: italic !important;
    }
  }
  ```

## Regras preservadas
- Componentes ≤ 7: continuam antes da operação na mesma página.
- Componentes > 7: continuam em página separada.
- Desenho (ou página branca de ausência) sempre **depois** das páginas de operação/componentes.
- Sem `page-break-after` no último item; mantém estratégia de `page-break-before` entre `op-print-unit` já configurada no CSS.

## Fora do escopo
- Modo "frente e verso seguro" — fica para depois.
- Alterações no backend / endpoint de desenhos.
- Refatoração para `RelatorioPrintEngine` (será feita na Wave 3 do plano maior).