## Problema

A coluna "Centros de custo" da tabela "Contas disponíveis do ERP" no Montador da DRE Gerencial está vazia (`—`) para todas as linhas. O frontend já espera o array `centros_custo[]` em cada conta (com aliases defensivos `ccu`, `centro_custo`, `cd_ccu`, etc.), mas o backend `/api/bi/contabilidade/dre-dinamica/plano-contas` aparentemente não está retornando esse agregado.

Isso é, portanto, **falha de contrato do backend FastAPI** — não há nada para "consertar" no Cloud ou na UI sem que o endpoint passe a devolver os centros de custo.

## Plano

### 1. Frontend (`src/pages/bi/contabilidade/DreMontadorPage.tsx`)
- Estender o `useMemo` de diagnóstico (`diag`) para também detectar quando **todas** as contas vêm com `centros_custo` vazio/ausente.
- Adicionar mensagem âmbar específica: "Backend não retornou `centros_custo[]` em nenhuma conta. Verifique o endpoint `/plano-contas` (agregação por `centro_custo` em `bi_vm_lanc_contabil`)."
- Não alterar a renderização da coluna (já trata `ccs.length === 0`).

### 2. Mapper (`src/lib/bi/dreMontadorApi.ts`)
- Ampliar aliases para o array de centros de custo, aceitando além de `centros_custo` / `ccu`: `centroscusto`, `centros`, `cc`, `centros_de_custo`.
- Ampliar aliases por item: já cobre `cd_centro_custo|centro_custo|cd_ccu` e descrição; adicionar `codigo`, `cod_ccu`, `nome_ccu` por segurança.
- Logar `console.warn('[MONTADOR DRE] backend não retornou centros_custo em nenhum item')` quando aplicável (espelhando o que já existe para `ds_conta`/`valor_total`).
- Logar uma amostra do primeiro `centros_custo` quando houver dados, para facilitar diagnóstico no console.

### 3. Documentação backend (`docs/backend-bi-contabilidade-dre-dinamica-montador.md`)
- Adicionar seção dedicada **"Agregação de centros de custo"** detalhando:
  - O array é obrigatório (pode vir vazio `[]`, mas o campo deve existir).
  - Origem: `bi_vm_lanc_contabil` agrupado por `mascara/cd_conta` + `centro_custo` no período.
  - Top 10 por `abs(valor) DESC`.
  - Join opcional com cadastro de CCU para popular `ds_centro_custo`.
  - SQL de referência (CTE com `GROUP BY cd_conta, centro_custo` e `json_agg`).
- Listar nomes de coluna canônicos: `cd_centro_custo`, `ds_centro_custo`, `qtd`, `valor` — e os aliases aceitos pelo frontend.

### SQL de referência sugerido (para o backend)

```sql
WITH base AS (
  SELECT
    l.mascara, l.cd_conta, l.centro_custo,
    count(*) AS qtd,
    sum(l.vl_saldo) AS valor
  FROM bi_vm_lanc_contabil l
  WHERE l.anomes_referente BETWEEN :ini AND :fim
  GROUP BY 1,2,3
),
ranked AS (
  SELECT b.*, ccu.descricao AS ds_centro_custo,
         row_number() OVER (PARTITION BY mascara, cd_conta ORDER BY abs(valor) DESC) rn
  FROM base b
  LEFT JOIN <ccu_cadastro> ccu ON ccu.codigo = b.centro_custo
)
SELECT mascara, cd_conta,
       json_agg(json_build_object(
         'cd_centro_custo', centro_custo,
         'ds_centro_custo', ds_centro_custo,
         'qtd', qtd,
         'valor', valor
       ) ORDER BY abs(valor) DESC) FILTER (WHERE rn <= 10) AS centros_custo
FROM ranked
GROUP BY 1,2;
```

### Fora de escopo
- Mudar layout/coluna da tabela.
- Alterar `/dre-dinamica` ou `vincular-contas`.
- Implementar o backend (FastAPI externo, fora do repositório).
