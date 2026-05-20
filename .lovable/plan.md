## Objetivo

Substituir a tabela de apontamento manual atual (5 linhas, 6 colunas) por uma nova tabela com **20 linhas e 9 colunas**, mantendo-a logo abaixo dos dados da operação e antes da mensagem de responsabilidade. Funciona em ambos os modos (com ou sem "Quebrar uma página por operação").

## Arquivos

- `src/components/producao/OpPrintSheet.tsx` — substituir o `<table>` atual (linhas ~234–257) dentro de `renderOperacao`.
- `src/components/producao/op-print.css` — adicionar a classe `.op-apontamento-table` e seus estilos (incluindo `@media print`).

## Mudanças

### 1. `OpPrintSheet.tsx` — bloco da tabela em `renderOperacao`

Trocar a tabela existente por:

```text
<table className="op-apontamento-table">
  <thead>
    <tr>
      <th>Início</th>
      <th>Fim</th>
      <th>Tempo Setup</th>
      <th>QTD Produzida</th>
      <th>Refugo</th>
      <th>Motivo Desvio</th>
      <th>Operador</th>
      <th className="check-cell">Check</th>
      <th>OBS</th>
    </tr>
  </thead>
  <tbody>
    {Array.from({ length: 20 }).map((_, r) => (
      <tr key={`apt-${i}-${r}`}>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td className="check-cell"><span className="check-box" /></td>
        <td>&nbsp;</td>
      </tr>
    ))}
  </tbody>
</table>
```

Remover a tabela antiga de 5 linhas/6 colunas para não duplicar informação.

### 2. `op-print.css` — adicionar estilos

Adicionar o bloco `.op-apontamento-table` com:
- `width: 100%`, `border-collapse: collapse`, `table-layout: fixed`, `margin-top: 4px`, `font-size: 8px`
- Larguras por coluna conforme spec (7/7/10/11/7/17/13/5/23%)
- `.check-box` 10×10px com borda preta
- `@media print`: `font-size: 7.5pt`, `page-break-inside: avoid`, `break-inside: avoid`, células com `height: 14px` e `border: 0.5pt solid #000`, `.check-box` 9×9px

A regra `page-break-inside: avoid` na tabela garante que, quando "Quebrar por operação" não estiver ativo e duas operações não couberem na mesma página, o navegador empurra a próxima operação para a página seguinte (item 6 da spec).

## Fora de escopo

- Nenhuma alteração de API/fetch.
- Nenhuma mudança no fluxo de paginação por operação (`OpPrintSheet` já trata isso).
- Nenhuma alteração nos filtros, cabeçalho da OP, rodapé ou lista de componentes.
