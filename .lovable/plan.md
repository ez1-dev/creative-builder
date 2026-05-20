## Problema

O backend `/api/producao/ordem-producao/{opcoes,impressao}` recebe `cod_emp` e `num_orp` como **string** (vindos dos selects/autocomplete), mas espera **integer**, retornando 422 (`Input should be a valid integer`).

## Correção (somente frontend, sem mudar contratos)

Coerção numérica na camada de chamada da API, mantendo `string` no estado dos filtros (o resto do código já assume string).

### 1. `src/hooks/useOpcoesImpressaoOp.ts`
No `fetchOpcoes`, normalizar params antes do `api.get`:
- `cod_emp` → `Number(cod_emp)` se não vazio, senão omitir
- `num_orp` → `Number(num_orp)` se não vazio, senão omitir
- `cod_ori`, `cod_etg`, `cod_cre`, `q` → enviar só se truthy
- `limite_ops` → já numérico

Assim todas as chamadas em cascata (`reloadBase`, `reloadByEmpresa`, `reloadByOrigem`, `reloadEstagios`, `reloadCres`, `searchOps`) ficam corrigidas de uma vez.

### 2. `src/hooks/useImpressaoOrdemProducao.ts`
No `fetchData`, montar payload tipado:
```ts
const payload = {
  cod_emp: Number(filters.cod_emp),
  cod_ori: filters.cod_ori,
  num_orp: Number(filters.num_orp),
  listar_componentes: filters.listar_componentes,
  listar_desenho: filters.listar_desenho,
  ...(filters.cod_etg ? { cod_etg: filters.cod_etg } : {}),
  ...(filters.cod_cre ? { cod_cre: filters.cod_cre } : {}),
};
```
e usar em `api.get(..., payload)`.

### 3. Validação adicional em `ImpressaoOrdemProducaoPage.consultar`
Antes de chamar `fetchData`, checar `Number.isFinite(Number(filtros.cod_emp))` e idem para `num_orp`; se inválido, toast e abort. (defensivo)

### Fora de escopo
- Mudar tipos das interfaces (`cod_emp: string | number` continua).
- Backend.
- Layout/A4/código de barras.

## Validação
1. Abrir `/producao/impressao-op` → `opcoes?limite_ops=80` deve retornar 200 (sem cod_emp).
2. Selecionar Empresa → request com `cod_emp=1` (numérico) → 200.
3. Selecionar OP → Consultar → `/impressao?cod_emp=1&cod_ori=210&num_orp=86993...` → 200.
4. Conferir no console que não há mais 422 `Input should be a valid integer`.
