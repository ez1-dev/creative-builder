# Ajustes no layout de impressão da Ordem de Produção

Apenas alterações em `src/components/producao/op-print.css` e pequenos ajustes em `src/components/producao/OpPrintSheet.tsx`. Nenhuma mudança de backend, dados ou modo "quebrar por operação / componentes / desenhos".

## Diagnóstico (a partir do print enviado)

Na imagem, a página 1 termina com uma linha de cabeçalho órfã (`inicio | data | tempo setup | fim | data | qtd produzida | refugo`) e a página 2 começa com a linha de continuação (`Cod. desvio | obs | operador | check`) sem o bloco de cima. Ou seja: cada bloco de apontamento (4 linhas: head1 + fill1 + head2 + fill2) está sendo cortado no meio entre páginas.

Além disso:

- No preview, `.op-sheet` tem `min-height: 297mm` mas sem o redutor de fonte/alturas do `@media print` — o bloco de apontamento (`apt-fill` = 11mm na tela vs 10.5mm na impressão, header 5mm vs 3.8mm) fica maior do que na folha real, e a 6ª repetição vaza para a "página" seguinte, dando essa sensação de quebra estranha.
- O cabeçalho do agrupamento ("AGRUPAMENTO 74448") e o bloco "REV / MOD / ROT" estão renderizados com fontes maiores na tela do que na impressão, o que também contribui para o desalinhamento.
- Margens da página A4 hoje: `@page { margin: 8mm }` + padding `.op-sheet { padding: 4mm }` no print = 12mm efetivos. Está OK, mas o conteúdo está calibrado para um padding de 4mm. Vamos manter.

## Mudanças

### 1. `src/components/producao/op-print.css`

#### a) Manter cada bloco de apontamento inteiro (não quebrar entre páginas)

Hoje cada par head/fill é um `<tr>` independente, e o navegador pode cortar entre eles. Vamos:

- Envolver cada bloco de 4 linhas (head1, fill1, head2, fill2) em um `<tbody>` próprio (alteração em `OpPrintSheet.tsx`, ver item 2).
- Adicionar no CSS (dentro e fora de `@media print`):

```css
.op-apontamento-table tbody.op-apt-block {
  page-break-inside: avoid;
  break-inside: avoid;
}
.op-apontamento-table tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
```

E remover (no print) o `page-break-inside: auto` atual em `.operation-single-page .op-operation` — deixar `avoid` para o cabeçalho da operação ficar grudado no primeiro bloco; os blocos individuais respeitam o `avoid` de cada `tbody`.

#### b) Alinhar preview ao print

No `.op-sheet` base (não-print), aplicar as mesmas reduções já existentes em `@media print` para:

- `.op-title` 10.5pt, `.op-section-title` 8pt
- `.op-header-data` colunas `50px 1fr 50px 1fr`, row-gap 1pt
- `.op-apontamento-table` font 7pt, fill 10.5mm, head 3.8mm
- `.op-operation` padding 2pt 3pt

Assim o preview reflete fielmente a folha real e o usuário enxerga no monitor o que sairá impresso (uma OP = uma página).

#### c) Forçar `max-height` do `.op-sheet` no preview

Hoje o preview só tem `min-height: 297mm` — se algo vazar, vira "página 2". Adicionar:

```css
.op-sheet--preview { 
  max-height: 297mm; 
  overflow: hidden; 
}
```

Assim qualquer overflow vira aviso visual imediato (e não falsa "página 2"), e em impressão real (sem a classe `--preview`) o comportamento atual continua.

#### d) Alinhamento das colunas do `op-apontamento-table`

As larguras hoje somam 100% (11+11+12+11+11+22+22) mas a 2ª linha usa `colSpan={4}` para "obs". Garantir `table-layout: fixed` (já está) e adicionar `text-align: center` aos headers e `vertical-align: middle` para evitar o desalinhamento visível entre `tempo setup` e `qtd produzida`.

#### e) Margens da página

Manter `@page { size: A4 portrait; margin: 8mm }` e `.op-sheet { padding: 4mm }` no print (total 12mm). Reduzir o `.op-sheet` base (tela) de `padding: 8mm` para `padding: 4mm` para igualar — o usuário enxerga exatamente o quadro impresso.

### 2. `src/components/producao/OpPrintSheet.tsx`

Em `renderOperacao`, substituir o `<tbody>` único por **um `<tbody class="op-apt-block">` por bloco** dentro da `op-apontamento-table`:

```tsx
{Array.from({ length: apontamentoBlocos }).map((_, r) => (
  <tbody key={`apt-${i}-${r}`} className="op-apt-block">
    <tr className="op-apt-head"> ... inicio/data/... </tr>
    <tr className="op-apt-fill"> ... </tr>
    <tr className="op-apt-head"> ... Cod. desvio/obs/operador/check </tr>
    <tr className="op-apt-fill op-apt-row-end"> ... </tr>
  </tbody>
))}
```

HTML permite múltiplos `<tbody>` dentro de uma `<table>`, e isso é o que viabiliza o `break-inside: avoid` no bloco inteiro.

## Critérios de aceite

- No preview e na impressão, cada bloco de 4 linhas do apontamento aparece sempre inteiro — nunca uma "linha de cabeçalho órfã" no fim da página ou "Cod. desvio" solto no topo.
- Uma OP com 1 operação cabe em 1 página A4 retrato com `apt-blocos-6`, sem vazar para uma segunda página fantasma no preview.
- Cabeçalho (Origem/O.P., Qtde, Produto, REV/AGRUPAMENTO) com as mesmas proporções na tela e na impressão.
- Modos preservados: "quebrar por operação", componentes inline (≤7), página separada de componentes, desenhos pós-OP, OP sem operação.

## Fora de escopo

- Backend `/api/producao/ordem-producao/impressao`
- Layout de desenhos (já paginado em A4)
- Componentes em página separada
- Mudanças de tipografia além das listadas (sem trocar família de fonte)
