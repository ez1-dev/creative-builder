

## Exibir horas e minutos no Resumo por Operador

### O que muda
Na coluna "Horas" do card "Operadores no período" em `src/pages/AuditoriaApontamentoGeniusPage.tsx`, trocar a exibição decimal (ex.: `12,50`) pelo formato `12h 30min`.

### Implementação
- Criar helper local `formatHorasMin(totalHoras: number)` que converte o decimal em horas inteiras + minutos:
  ```ts
  const h = Math.floor(totalHoras);
  const m = Math.round((totalHoras - h) * 60);
  return `${h}h ${String(m).padStart(2,'0')}min`;
  ```
- Renomear o cabeçalho da coluna para "Horas (h/min)".
- Aplicar o mesmo formato no rodapé/resumo de total de horas do card.
- Manter o valor numérico bruto no objeto `operadoresAgg` para preservar a ordenação por maior carga horária.

### Validação
- Após pesquisar, a coluna mostra valores como `12h 30min` em vez de `12,50`.
- Total geral no header do card também aparece em `Xh YYmin`.
- Ordenação por horas continua correta (decrescente).

