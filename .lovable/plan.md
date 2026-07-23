## Diagnóstico (confirmado com o payload)

O backend está devolvendo `drills_menu[].agrupamentos` como **array de strings**:

```json
{ "card": "total_liquido", "agrupamentos": ["evento", "filial", "mes"] }
```

Mas o parser em `src/lib/rh/api.ts` (linhas 300-308) assume que cada agrupamento é um **objeto** com `key`/`label`:

```ts
a.agrupamentos.map((a: any) => ({
  key: String(a?.key ?? a?.agrupar_por ?? a?.id ?? "").trim(),
  ...
})).filter((a: any) => a.key)
```

Quando `a` é a string `"evento"`, `a?.key` é `undefined` → `key` vira `""` → o `.filter(a.key)` **descarta todos**. Resultado: `drillItem.agrupamentos = []` para TODOS os cards que o backend enviou como string (é justamente o formato atual: `total_liquido`, `provento`, `desconto`, `hora_extra`, etc.).

Por isso o drawer do Líquido abre sem abas — cai no ramo "sem agrupamentos" (invisível pelo layout do skeleton) e a query nunca dispara. O fallback que adicionei antes só cobria alguns cards de valor, então cards como `total_liquido` ainda ficam vazios se não estiverem na whitelist e mesmo cards com fallback perdem os agrupamentos extras (colaborador, evento_colaborador, analitico) que o backend explicitamente enviou.

## Escopo (somente front, 1 arquivo)

`src/lib/rh/api.ts` — normalização de `drills_menu`:

1. Aceitar `agrupamentos` em duas formas:
   - **String** (formato atual do backend): `"evento"` → `{ key: "evento", label: AGRUPAMENTO_LABELS["evento"] ?? "evento" }`.
   - **Objeto** (retrocompat): mantém o mapeamento atual `key/agrupar_por/id` + `label/nome`.
2. Continuar filtrando entradas cujo `key` final seja vazio.
3. Manter o restante do parser inalterado.

## Efeito

- `total_liquido` passa a expor 3 abas (evento/filial/mês) e a query dispara.
- `provento`, `desconto`, `hora_extra`, `custo_ferias`, `beneficios`, `rescisoes`, `fgts`, `inss_total`, `outras_gratificacoes` ganham os 7 níveis (evento, filial, mes, colaborador, evento_colaborador, colaborador_evento, analitico).
- `salario_base` e `inss_patronal` expõem colaborador/filial/mes (usando `richMode` já existente).
- `provisoes` e `custo_total` expõem componente/filial/mes.
- O fallback local em `ResumoFolhaDrillDrawer.tsx` deixa de ser acionado (agrupamentos reais chegam), mas fica como salvaguarda — não precisa remover.

## Fora de escopo

- Backend, endpoints, tabelas, contratos.
- Layout do drawer, cálculos, labels adicionais.
- Reverter o log de diagnóstico e empty-state adicionados anteriormente.
