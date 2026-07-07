## Rótulo "Outros" em caixa alta no gráfico "Por Motivo de Viagem"

Em `src/components/passagens/PassagensDashboard.tsx`, alterar a constante `OUTROS_LABEL` (linha ~227) de `'Outros'` para `'OUTROS'`, para ficar consistente com os demais motivos que agora aparecem em caixa alta (DEMISSÃO, FÉRIAS, CONTRATAÇÃO, etc.).

Também atualizar textos de UI que exibem literalmente `"Outros"`:
- Título do modal "Detalhamento — Outros motivos" → "Detalhamento — OUTROS motivos".
- Link "Ver detalhamento de \"Outros\" (N motivos)" → "Ver detalhamento de \"OUTROS\" (N motivos)".

Sem outras mudanças (lógica de agrupamento, cores, cross-filter permanecem iguais — a comparação usa a mesma constante).

### Validação
Abrir `/passagens-aereas`: fatia agrupada exibe "OUTROS", link e título do modal também.
