## Unificar Subtotal do card Registros

Hoje aparecem **dois subtotais** no rodapé do card Registros (quando há mais de uma página):

- `Subtotal página · 25 registros — R$ 53.410,22`
- `Total geral · 300 registros — R$ 519.825,35`

Vou deixar apenas **um** — o **Total geral** dos filtros aplicados, que é o número que importa. Renomeado para apenas `Subtotal`, sem a divisão "página/geral".

### Alterações

Arquivo único: `src/components/passagens/PassagensDashboard.tsx`

1. **Modo cards (mobile/compacto)** — substituir o bloco de duas linhas por uma única linha:
   ```
   Subtotal · 300 registros        R$ 519.825,35
   ```

2. **Modo tabela (desktop)** — no `TableFooter`, remover a `TableRow` extra "Total geral" e manter apenas uma linha mostrando o subtotal de **todos** os registros filtrados (não da página):
   ```
   Subtotal · 300 registros        R$ 519.825,35
   ```

3. Os controles de paginação (« ‹ Página X de Y › ») continuam abaixo, sem mudanças.

### Fora do escopo

- Não mexer em paginação, controles de página, busca, ordenação ou agrupamento.
- Não mexer nos KPIs do topo.
