# Corrigir orientação da impressão de OP (forçada para paisagem por outro CSS)

## Causa

Duas regras `@page` globais coexistem no bundle:

- `src/components/producao/op-print.css:410` → `@page { size: A4 portrait; margin: 8mm }`
- `src/pages/bi/relatorio.css:87` → `@page { size: A4 landscape; margin: 10mm }`

Como `@page` sem nome se aplica ao documento inteiro e ambos os arquivos ficam carregados na SPA depois que o usuário navega pelo Relatório Executivo, a última declaração vence — saída do PDF: 841.92×594.96pt (A4 paisagem) em vez de retrato.

## Solução: páginas nomeadas (`@page <nome>`)

Usar `@page` nomeado em cada stylesheet e amarrar o nome ao elemento raiz daquele documento via `page: <nome>`. Assim cada folha respeita sua própria orientação independente de ordem de carga.

### 1. `src/components/producao/op-print.css`

Substituir:

```css
@page { size: A4 portrait; margin: 8mm; }
```

por:

```css
@page op-print { size: A4 portrait; margin: 8mm; }
```

E dentro do `@media print`, adicionar:

```css
.op-sheet,
.op-print-page,
.op-operation-page,
.operation-single-page,
.componentes-page,
.op-drawing-page,
.op-missing-drawing-page {
  page: op-print;
}
```

### 2. `src/pages/bi/relatorio.css`

Substituir:

```css
@page { size: A4 landscape; margin: 10mm; }
```

por:

```css
@page rel-doc { size: A4 landscape; margin: 10mm; }
```

E dentro do `@media print` daquele arquivo, adicionar:

```css
#rel-doc { page: rel-doc; }
```

(Já existe `#rel-doc` como container do documento imprimível.)

## Critérios de aceite

- Imprimir uma OP gera PDF/papel em A4 **retrato** (595×842pt), independentemente de o usuário ter aberto antes a tela de Relatório Executivo.
- Imprimir o Relatório Executivo continua saindo em A4 paisagem.
- Não muda nada de layout, margens internas ou conteúdo dos relatórios.

## Fora de escopo

- Outros ajustes do layout de impressão de OP (já feitos na rodada anterior).
- Backend / dados.
