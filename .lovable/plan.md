

## Separar Horas e Minutos em colunas distintas

### O que muda
No card "Operadores no período" em `src/pages/AuditoriaApontamentoGeniusPage.tsx`, substituir a coluna única "Horas (h/min)" por **duas colunas independentes**:

- **Horas** → parte inteira da conversão (ex.: `12`)
- **Minutos** → minutos restantes da conversão (ex.: `30`)

Exemplo: `12,5h` decimal → coluna Horas = `12`, coluna Minutos = `30`.

### Implementação
- No `useMemo` `operadoresAgg`, derivar dois novos campos por operador a partir de `total_horas`:
  ```ts
  const totalMin = Math.round(total_horas * 60);
  horas_int = Math.floor(totalMin / 60);
  minutos_resto = totalMin % 60;
  ```
- Substituir a definição da coluna `total_horas` no `DataTable` por duas colunas:
  - `{ key: 'horas_int', header: 'Horas', align: 'right' }`
  - `{ key: 'minutos_resto', header: 'Minutos', align: 'right' }`
- Manter `total_horas` no objeto (oculto) só para ordenação default decrescente.
- No header do card, manter o total geral no formato `Xh YYmin` (já implementado) — sem mudança ali.

### Validação
- Card mostra colunas separadas: Código | Operador | OPs | **Horas** | **Minutos** | Apontamentos.
- Operador com 12,5h decimais aparece como Horas=`12` e Minutos=`30`.
- Ordenação por Horas (clique no header) ordena pelos valores numéricos corretamente.
- Total geral no topo do card permanece em `Xh YYmin`.

