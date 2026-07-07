## Ajustes de rótulos em Passagens Aéreas

Escopo: apenas exibição do motivo da viagem no dashboard `/passagens-aereas`. Sem mudanças em dados, API, filtros, cross-filter ou lógica de agregação.

### Alterações em `src/components/passagens/PassagensDashboard.tsx`

1. Substituir o fallback `'Não informado'` usado para `motivo_viagem` por `'TRANSFERENCIA DE OBRA'` nos pontos onde a coluna `motivo_viagem` está vazia/nula:
   - `applyCross` (linha ~285) — quando aplica selectedMotivo.
   - Agrupamento do gráfico "Por Motivo de Viagem" (linha ~497) — chave usada em `porMotivo`, `porMotivoOutros`, tabela do modal "Detalhamento — Outros motivos" e legenda.
   - Entrada `groupOptions` para `motivo_viagem` (linha 78): `empty: 'TRANSFERENCIA DE OBRA'`.
   - Não alterar os demais campos que também usam "Não informado" (tipo_despesa etc.).

2. Padronizar os nomes de motivo em CAIXA ALTA na exibição do gráfico e do modal "Detalhamento — Outros motivos", para que valores vindos do ERP em mixed-case (ex.: "Contratação") apareçam como "CONTRATAÇÃO", alinhados aos demais (DESISTÊNCIA, REMARCAÇÃO, VIAGEM OBRA, PARTICULAR). Aplicar `.toLocaleUpperCase('pt-BR')` apenas no `name` usado para render (gráfico Pie, legenda inline e linhas da tabela de outros motivos). Manter o valor original nas comparações do cross-filter (a chave de agrupamento já será o texto uppercased, então continua consistente).

### Fora de escopo
- Filtro topo "Motivo da Viagem" (dropdown de seleção): mantém os valores originais do ERP.
- Nenhuma outra tela, KPI, export, ou lógica de negócio.

### Validação
- Abrir `/passagens-aereas`, conferir gráfico "Por Motivo de Viagem": registros sem motivo aparecem como TRANSFERENCIA DE OBRA; "Contratação" aparece como CONTRATAÇÃO.
- Abrir modal "Detalhamento — Outros motivos": mesmas regras aplicadas.
- Clicar em uma fatia continua filtrando o dashboard normalmente.
