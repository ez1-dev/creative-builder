## O que mudar

Hoje os mapas (`brazil-state-map`, `brazil-heat-map`, `brazil-heat-map-comercial`) só aparecem no dropdown **Componente** da aba "Biblioteca BI" quando o bloco que você está configurando é o `estados`. Em qualquer outro bloco (Mix acumulado, Revendas, Obras, série mensal…) eles não aparecem.

Você quer que os mapas fiquem disponíveis como opção em **todos** os blocos compatíveis.

## Plano

Em `src/lib/bi/comercialWidgetCatalog.ts`:

1. Criar uma constante `LIB_MAP_IDS = ['brazil-state-map', 'brazil-heat-map-comercial', 'brazil-heat-map']`.

2. Adicionar `...LIB_MAP_IDS` ao `libraryComponentIds` de todos os blocos não-KPI e não-tabela que produzem séries com dimensão geográfica plausível:
   - `serie-mensal` (mantém charts + mapas — usuário pode trocar livremente)
   - `mix`
   - `estados` (já tem; só consolida via `LIB_MAP_IDS`)
   - `revendas`
   - `obras`

3. Não incluir nos blocos KPI (`kpi-*`) nem na tabela (`table-mensal`) — mapas não fazem sentido lá.

Nada mais muda: o `componentRegistry` já expõe os 3 mapas, e o `BrazilHeatMap` genérico aceita qualquer série `{uf, valor}` via `autoMap`. Se a série do bloco não tiver UF (ex.: meses, revendas), o mapa renderiza vazio — mas isso é responsabilidade do usuário ao escolher.

## Resultado esperado

Ao abrir "Configurar bloco" em qualquer gráfico do BI Comercial e ir na aba **Biblioteca BI**, o dropdown **Componente** lista também: `Mapa Brasil por Estado`, `Mapa de Calor (Comercial)` e `Mapa de Calor (Brasil)`.
