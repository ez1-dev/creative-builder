# Corrigir página em branco no início da impressão de OP

## Causa

Após introduzir `@page op-print` e aplicar `page: op-print` apenas em `.op-sheet`, `.op-print-page`, etc., o Chromium inicia o documento na página padrão (sem nome) e dispara uma quebra de página automática antes do primeiro elemento com `page` nomeado diferente. Resultado: a primeira folha sai em branco.

## Solução

Aplicar `page: op-print` também na raiz da árvore imprimível, para que o documento inteiro já comece na página nomeada e nenhum break inicial seja inserido.

### `src/components/producao/op-print.css` — dentro do `@media print`

Adicionar regra:

```css
html, body, .print-root, .op-print-batch, .op-print-group {
  page: op-print;
}
```

Manter o `page: op-print` já adicionado nas folhas individuais (`.op-sheet`, etc.) — não causa break adicional porque o valor é o mesmo herdado.

### `src/pages/bi/relatorio.css` — dentro do `@media print`

Como `#rel-doc` agora também declara `page: rel-doc`, garantir que `html, body` continuem na página padrão (não nomear globalmente) para não interferir em outras telas. Manter como está; somente `#rel-doc` muda o named page. Isso já está OK e não exige alteração — só verificar que o impressão do Relatório Executivo segue saindo em paisagem.

## Critérios de aceite

- Impressão de OP começa imediatamente na primeira folha (sem página em branco no início), em A4 retrato.
- Impressão do Relatório Executivo segue em A4 paisagem, sem regressão.

## Fora de escopo

- Demais ajustes de layout da OP.
- Backend/dados.
