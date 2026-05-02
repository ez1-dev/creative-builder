# Painel de Compras — `situacao_oc` aceitando múltiplas situações

## Status: RESOLVIDO

O backend foi atualizado para aceitar CSV em `situacao_oc`:

- Tipo do parâmetro mudou de `Optional[int]` para `Optional[str]`.
- `/api/painel-compras` e `/api/export/painel-compras` agora aceitam:
  - `situacao_oc=4` → filtra `SITOCP = 4`
  - `situacao_oc=1,2,3` → filtra `SITOCP IN (1,2,3)`
  - ausente/vazio → não filtra
- O parser do backend faz `split(',')`, `strip` e `int(...)` em cada parte.

## Frontend

`src/pages/PainelComprasPage.tsx` envia o parâmetro como CSV em ambos
`search` (paginação) e `exportParams` (Excel):

```ts
const situacoesSel: string[] = Array.isArray(params.situacao_oc) ? params.situacao_oc : [];
if (situacoesSel.length > 0) params.situacao_oc = situacoesSel.join(',');
else delete params.situacao_oc;
```

A mitigação client-side `MITIGACAO_SITUACAO_OC_MULTI` foi **removida** —
totais, paginação e exportação agora são consistentes com o filtro
selecionado.

## Contrato

`GET /api/painel-compras` — parâmetro `situacao_oc`:

| Valor recebido       | Comportamento                                    |
|----------------------|--------------------------------------------------|
| ausente / vazio      | Não filtra (todas as situações)                  |
| `4`                  | Filtra `E300OCP.SITOCP = 4`                      |
| `1,2,3`              | Filtra `E300OCP.SITOCP IN (1,2,3)`               |
| `1, 2 , 3`           | Aceito (trim + split por vírgula)                |

Mesma regra vale em `/api/export/painel-compras`.
