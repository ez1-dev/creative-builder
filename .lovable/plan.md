## Diagnóstico

No plano anterior, para a página de componentes caber sem estourar a folha A4 (`.op-sheet` tem `min-height: 297mm` + `padding: 8mm`, que somavam mais que a área útil), zerei o `padding` do `.op-sheet` em todas as folhas de impressão:

```css
.op-print-page .op-sheet,
.op-operation-page .op-sheet,
.operation-single-page,
.op-sheet.componentes-page { padding: 0 !important; }
```

Combinado com `@page { margin: 7mm }`, sobrou só 7mm de espaço entre o conteúdo e a borda do papel — antes eram 7mm + 8mm internos = ~15mm. Daí a impressão "encostou" na borda.

## Solução

Devolver os ~8mm internos sem voltar a estourar a folha. Em vez de zerar `padding`, **manter** `padding: 8mm` no `.op-sheet` e remover o `min-height: 297mm` na impressão (deixando a altura ser ditada pelo conteúdo + page-break).

## Mudanças

Tudo em `src/components/producao/op-print.css`, dentro do bloco `@media print`:

1. **Trocar `padding: 0` por `padding: 8mm` (na verdade, deixar herdar)**

   Remover este bloco:

   ```css
   .op-print-page .op-sheet,
   .op-operation-page .op-sheet,
   .operation-single-page { padding: 0 !important; }
   ```

   E em `.op-sheet.componentes-page` trocar `padding: 0 !important` por nada (deixar herdar os 8mm padrão do `.op-sheet`).

2. **Remover o `min-height` que causaria estouro**

   Adicionar:

   ```css
   @media print {
     .op-sheet { min-height: 0 !important; }
   }
   ```

   Assim cada folha cresce só até onde o conteúdo pede, e `page-break-after: always` em `.op-print-page / .op-operation-page / .componentes-page / .op-drawing-page / .operation-single-page` garante uma folha por bloco.

3. **Manter `@page { margin: 7mm }`** — Combinado com os 8mm internos do `.op-sheet`, dá os ~15mm de margem visual que tinha antes.

4. **Não mexer na densidade dos componentes (compact-31-50 etc.)** — continua funcionando: ela só altera font-size/padding das células da tabela, não do container.

## Validação

- OP 21264 (caso da imagem): preview já vinha OK, e o Ctrl+P agora deve mostrar ~15mm de espaço branco em volta do conteúdo.
- OP 1109 (~30 componentes) e OP com 50/70 componentes: tabela continua cabendo numa só folha com as classes densas, agora com a margem restaurada.
- OP 7093 (multi-operações): contagem de folhas no Ctrl+P deve continuar batendo com o preview.

## Fora de escopo

- Sem mudar `OpPrintSheet.tsx`, `OpPrintBatch.tsx`, hooks ou backend.
- Sem mudar `@page` margin.
