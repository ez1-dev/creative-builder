# RelatorioPrintEngine

Motor de impressão e geração de PDF unificado do Sapiens Control Center.
A partir da Onda 5/6 é o único caminho de impressão/PDF do sistema.

## Visão geral

```
                  ┌────────────────────┐
   dados de       │  adapter (por      │     PrintDocument
   um módulo  ──▶ │  módulo / formato) │ ──────────────┐
                  └────────────────────┘                │
                                                        ▼
                                     ┌─────────────────────────────────┐
                                     │ PrintRenderer (React)           │  → window.print()
                                     │ exportPrintDocumentToPdf()      │  → arquivo .pdf
                                     └─────────────────────────────────┘
```

- `types.ts` — modelo de dados genérico (`PrintDocument`, `Block`, `PageSetup`)
  + `PrintDocumentBuilder` para montagem fluente.
- `PrintRenderer.tsx` — renderiza um `PrintDocument` em páginas A4/A3/Letter,
  aplicando cabeçalho/rodapé, paginação e quebras.
- `relatorio-print.css` — estilos compartilhados (margens via CSS vars,
  regras `@page`, comportamento de impressão).
- `exportPdf.tsx` — captura cada `.rp-page` com `html2canvas` e gera PDF
  multipágina via `jsPDF`. 100% client-side.
- `adapters/` — converte um domínio específico em `PrintDocument`.

## Adapters existentes

- `opAdapter.ts` — Ordem de Produção (`/producao/impressao-op`).
- `genericReportAdapter.ts` — relatórios SQL do módulo Relatórios.
- `etiquetaAdapter.ts` — etiquetas com código de barras (esqueleto).

## Criando um novo adapter

1. Crie `src/lib/relatorios/print/adapters/<nome>Adapter.ts`.
2. Exporte uma função `xxxToPrintDocument(input, opts): PrintDocument`.
3. Use `new PrintDocumentBuilder(title, pageSetup)` e adicione blocos:
   - `title`, `text`, `kv`, `table`, `barcode`, `image`, `spacer`, `group`,
     `pagebreak`.
   - Use `{ type: 'group', keepTogether: true, children: [...] }` para
     manter um sub-bloco numa página só.
4. Configure `.header(...)`, `.footer(...)` e `.meta(...)` quando precisar.
5. Re-exporte em `index.ts` se for usado por outro módulo.

### Exemplo mínimo

```ts
import { PrintDocumentBuilder, type PrintDocument } from '../types';

export function meuAdapter(linhas: any[]): PrintDocument {
  return new PrintDocumentBuilder('Meu Relatório')
    .header({ left: 'Meu Relatório', right: '{date}', border: true })
    .footer({ right: 'Página {page} de {pages}', border: true })
    .add({ type: 'title', text: 'Resumo', level: 2 })
    .add({
      type: 'table',
      columns: [{ key: 'codigo', title: 'Código' }, { key: 'descricao', title: 'Descrição' }],
      rows: linhas as Record<string, unknown>[],
      repeatHeader: true,
    })
    .build();
}
```

### Imprimir / gerar PDF

```tsx
import { PrintRenderer, exportPrintDocumentToPdf } from '@/lib/relatorios/print';

// Render para impressão / preview
<PrintRenderer doc={doc} preview />

// PDF client-side
await exportPrintDocumentToPdf(doc, { filename: 'meu-arquivo.pdf' });
```

## O que NÃO usar mais

- `OpPrintSheet` / `OpPrintBatch` — deprecated, serão removidos na próxima
  onda. Toda nova lógica de impressão de OP deve ir pelo `opAdapter`.
- `exportarRelatorio(id, 'pdf', ...)` no backend — substituído pelo
  caminho client-side via `genericReportAdapter` + `exportPrintDocumentToPdf`.
