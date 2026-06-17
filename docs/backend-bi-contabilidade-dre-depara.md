# DRE — De/Para conta + centro de custos (`bi_dre_depara_conta_ccu`)

Camada de classificação adicional para a DRE, mantida pelo frontend (tela `/bi/contabilidade/dre/parametrizacao`) diretamente no Lovable Cloud. **Não há endpoint REST de manutenção** — o frontend usa `supabase-js` com RLS (admin grava, qualquer authenticated lê).

## Tabela

`public.bi_dre_depara_conta_ccu`

| coluna             | tipo    | obs                                         |
|--------------------|---------|---------------------------------------------|
| `id`               | uuid    | PK                                           |
| `cd_conta_contabil`| text    | obrigatório, upper                           |
| `cd_centro_custos` | text    | obrigatório, upper. `'TODAS'` = regra geral  |
| `cd_mascara_dre`   | text    | obrigatório, uma das 9 máscaras DRE          |
| `descricao`        | text    | opcional                                     |
| `ativo`            | boolean | default true                                 |
| `criado_por`       | uuid    | auth.users                                   |
| `created_at`       | tz      | default now()                                |
| `updated_at`       | tz      | trigger `update_updated_at_column`           |

Índice único por `(upper(cd_conta_contabil), upper(cd_centro_custos))`.

## Aplicação na DRE

A RPC/consulta que monta `GET /api/bi/contabilidade/dre-matriz` e `bi_dre_drill_realizado` precisa decidir a `codigo_linha` de cada lançamento com a seguinte **ordem de prioridade** (primeiro que casar vence):

1. `bi_dre_classificacoes` ATIVO/APROVADO — escopo LANCAMENTO > DOCUMENTO > COMBINACAO > REGRA_DEFINITIVA
2. `bi_dre_excecoes` ATIVO (legado)
3. `bi_dre_depara_conta_ccu` ATIVO com `(cd_conta_contabil, cd_centro_custos)` **exato**
4. `bi_dre_depara_conta_ccu` ATIVO com `(cd_conta_contabil, 'TODAS')`
5. `bi_dre_mascara` (regra padrão atual por máscara de conta)
6. fallback `NAO_CLASSIFICADO`

Resolução sugerida em SQL (pseudo):

```sql
WITH depara_match AS (
  SELECT
    l.nr_lancamento,
    COALESCE(
      MAX(d_exato.cd_mascara_dre),
      MAX(d_todas.cd_mascara_dre)
    ) AS cd_mascara_depara
  FROM bi_vm_lanc_contabil l
  LEFT JOIN bi_dre_depara_conta_ccu d_exato
    ON d_exato.ativo
   AND upper(d_exato.cd_conta_contabil) = upper(l.cd_conta_contabil)
   AND upper(d_exato.cd_centro_custos)  = upper(l.cd_centro_custos)
  LEFT JOIN bi_dre_depara_conta_ccu d_todas
    ON d_todas.ativo
   AND upper(d_todas.cd_conta_contabil) = upper(l.cd_conta_contabil)
   AND d_todas.cd_centro_custos = 'TODAS'
  GROUP BY l.nr_lancamento
)
SELECT
  COALESCE(class.codigo_linha_destino,
           exc.codigo_linha_destino,
           dp.cd_mascara_depara,
           mas.codigo_linha,
           'NAO_CLASSIFICADO') AS codigo_linha,
  ...
FROM bi_vm_lanc_contabil l
LEFT JOIN bi_dre_classificacoes class ON ...
LEFT JOIN bi_dre_excecoes       exc   ON ...
LEFT JOIN depara_match          dp    ON dp.nr_lancamento = l.nr_lancamento
LEFT JOIN bi_dre_mascara        mas   ON mas.cd_conta = l.cd_conta_contabil;
```

A máscara em `bi_dre_depara_conta_ccu.cd_mascara_dre` segue o mesmo formato usado em `bi_dre_estrutura.mascara` — basta dar o JOIN com `bi_dre_estrutura` para obter `codigo_linha` final.

## Drill `LANCAMENTO`

O drill já retorna `cd_conta`, `cd_cencus`, etc. Para suportar o botão "Criar regra" do frontend, recomendamos incluir também:

- `cd_mascara` (máscara que `bi_dre_mascara` atribuiu, se houver) — exibido como "Máscara atual"
- `cd_mascara_sugerida` (mesma máscara, pré-selecionada no modal) — opcional, frontend já lê de `cd_mascara` quando vazio

## Não fazer

- Não gerar regras automaticamente — toda inserção vem de ação explícita do usuário.
- Não usar exceção por lançamento para casos resolvíveis pelo de/para conta + centro.
