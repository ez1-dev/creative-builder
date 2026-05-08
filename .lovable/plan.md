## Objetivo

Adicionar duas novas opções de agrupamento no card **Registros** do dashboard de Passagens Aéreas: **Cidade de Destino** e **Estado (UF) de Destino**. Hoje o seletor do card oferece apenas Centro de Custo, Projeto/Obra, Colaborador, Motivo da Viagem, Cia Aérea e Tipo de Despesa.

## Onde

`src/components/passagens/PassagensDashboard.tsx`

## Como

1. Estender o tipo `GroupBy` (linha 63) adicionando `'cidade_destino' | 'uf_destino'`.

2. Adicionar dois itens em `GROUP_OPTIONS` (linha 65):
   - `{ value: 'cidade_destino', label: 'Cidade de Destino', empty: 'Sem cidade' }`
   - `{ value: 'uf_destino', label: 'Estado (UF)', empty: 'Sem UF' }`

3. Ajustar o cálculo dos grupos (linha ~340, onde lê `(r as any)[groupBy]`) para tratar esses dois casos:
   - `cidade_destino`: usa `nomeNormalizado(r.destino)` como chave de agrupamento e mantém o label original mais frequente como rótulo (mesmo padrão já usado em `porCidade` no gráfico Top Cidades).
   - `uf_destino`: usa `(r.uf_destino ?? '').toUpperCase()` como chave/label.

   Isso evita que a mesma cidade apareça duplicada por variações de capitalização/acento (ex.: "São Paulo" vs "SAO PAULO").

4. O resto do fluxo (renderização do card, ordenação, exportação CSV/XLSX, sheet "Registros agrupados por…", colunas da tabela) já é genérico em `groupOption.label` e em `gruposGenericos` — não precisa mexer.

## Sem mudanças em

- Banco, backend, edge functions, permissões, layout dos widgets.
- Outros gráficos (já existem cards Top Cidades e Top UFs).

## Resultado

No card **Registros** o usuário poderá selecionar "Cidade de Destino" ou "Estado (UF)" no dropdown, ver a contagem e o valor total por destino, abrir cada grupo no sheet lateral e exportar em CSV/XLSX seguindo o mesmo padrão dos demais agrupamentos.
