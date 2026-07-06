## Mostrar valor acima de cada mês no "Histórico Nº Colaboradores"

Ativar rótulos de dados no `AreaChartCard` já existente, sem tocar no componente base — apenas passando `visualConfig` no chamador.

### `src/pages/rh/QuadroColaboradoresPage.tsx` (linha ~414, `AreaChartCard`)
Adicionar prop `visualConfig`:
```ts
visualConfig={{
  dataLabels: {
    visible: true,
    position: 'top',
    fontSize: 12,
    format: 'number',    // não usar 'compact' — mostrar 507, 491, etc.
    decimals: 0,
    prefix: '',
    suffix: '',
    richLabel: false,
  },
}}
```

Resultado: número exato ("507", "491", "413", …) fica acima de cada ponto do mês, como no print de referência.

### Fora de escopo
- Não trocar layout, cores nem eixo (X já mostra `MM/AAAA` via `fmtAnomes`).
- Não alterar `AreaChartCard` compartilhado.
