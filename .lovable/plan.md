## Objetivo

Restaurar a tabela antiga de apontamento (5 linhas × 6 colunas) e **manter também** a nova tabela (20 linhas × 9 colunas) logo abaixo dela, dentro de cada bloco de operação, antes da mensagem de responsabilidade.

## Arquivo

- `src/components/producao/OpPrintSheet.tsx` — em `renderOperacao` (após o bloco de dados da operação, antes da mensagem de responsabilidade).

## Mudança

Hoje só existe a tabela nova (`.op-apontamento-table`, 20 linhas / 9 colunas). Vou **reinserir a tabela antiga acima dela**, preservando o markup original:

```text
<table style={{ marginTop: 4 }}>
  <thead>
    <tr>
      <th>Início</th>
      <th>Fim</th>
      <th>Qtd. Produzida</th>
      <th>Refugos</th>
      <th>Operador</th>
      <th style={{ width: 30, textAlign: 'center' }}>Check</th>
    </tr>
  </thead>
  <tbody>
    {Array.from({ length: 5 }).map((_, r) => (
      <tr key={`apt-old-${i}-${r}`} className="op-apontamento-row">
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td style={{ textAlign: 'center' }}><span className="op-apontamento-cell-check" /></td>
      </tr>
    ))}
  </tbody>
</table>
```

Logo em seguida, a tabela nova (`.op-apontamento-table`, 20 linhas × 9 colunas) já existente permanece como está.

Ordem final dentro do bloco de operação:
1. Dados da operação
2. Tabela antiga (5 linhas)
3. Tabela nova (20 linhas)
4. Mensagem de responsabilidade
5. Rodapé

## Fora de escopo

- Sem mudanças no CSS (estilos antigos `.op-apontamento-row` / `.op-apontamento-cell-check` já existem).
- Sem mudanças em filtros, cabeçalho da OP, paginação ou API.
