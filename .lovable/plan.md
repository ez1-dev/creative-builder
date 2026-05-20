## Adicionar título "Ordens de Produção - GENIUS"

Incluir um título principal no topo da folha de impressão da OP, acima do bloco "Origem/O.P.".

### Alterações

**`src/components/producao/OpPrintSheet.tsx`**
- Adicionar `<div className="op-title">Ordens de Produção - GENIUS</div>` como primeiro elemento dentro de `.op-sheet`, antes do `.op-header-top`.

**`src/components/producao/op-print.css`**
- Nova classe `.op-title`:
  - `text-align: center`
  - `font-size: 13px`
  - `font-weight: bold`
  - `text-transform: uppercase`
  - `border-bottom: 1px solid #000`
  - `padding-bottom: 4px`
  - `margin-bottom: 6px`

### Fora de escopo
Demais seções (cabeçalho, componentes, operações, rodapé) permanecem inalteradas. O título aparecerá em todas as páginas do lote.
