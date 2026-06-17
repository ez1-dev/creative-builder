# Backend — Classificação assistida da DRE

Endpoints para reclassificar lançamentos da DRE com escopos progressivos
(LANCAMENTO, DOCUMENTO, COMBINACAO, REGRA_DEFINITIVA) e simulação de impacto.

## 1. `POST /api/bi/contabilidade/dre-classificar-lancamento`

Body JSON:

```json
{
  "anomes_referente": 202603,
  "nr_lancamento": "12345",
  "nr_lote": "678",
  "nr_documento": "20758",
  "cd_mascara": "3.01.02",
  "cd_conta_contabil": "3010201",
  "cd_centro_custos": "01.01",
  "cd_centro_custos_3": "01.01.03",
  "cd_origem_lcto": "FAT",
  "cd_tns": "1-6101S",
  "ds_historico": "...",
  "vl_realizado": 1234.56,
  "codigo_linha_origem": "RECEITA_BRUTA",
  "codigo_linha_destino": "DEDUCOES_VENDAS",
  "escopo": "LANCAMENTO",
  "motivo": "Lançamento de devolução classificado errado."
}
```

Comportamento:
- Insere uma linha em `public.bi_dre_classificacoes` na camada Cloud.
- `escopo == 'REGRA_DEFINITIVA'` → `status='PENDENTE_APROVACAO'`.
- Demais escopos → `status='ATIVO'`.
- Decimal→float antes de serializar. `traceback.print_exc()` em erro e
  `HTTPException(status_code=502, detail=str(e))`.

Resposta:
```json
{ "id": "uuid", "status": "ATIVO" }
```

## 2. `POST /api/bi/contabilidade/dre-classificar-simular`

Mesmo body do endpoint acima + `ano`, `mes_ini`, `mes_fim`, `unidade` opcional.

Retorno:
```json
{
  "linha_origem":  { "codigo": "RECEITA_BRUTA",   "antes": 1000000, "depois":  950000 },
  "linha_destino": { "codigo": "DEDUCOES_VENDAS", "antes": -200000, "depois": -250000 },
  "qtd_lancamentos_afetados": 1
}
```

Cálculo (resumo):

1. Reaplica `bi_vm_lanc_contabil` + `bi_dre_regras` (mesma lógica da matriz),
   ignorando a tabela `bi_dre_classificacoes` para calcular o valor `antes`.
2. Filtra os lançamentos candidatos a serem reclassificados de acordo com o `escopo`:
   - `LANCAMENTO`: `nr_lancamento = :nr_lancamento`
   - `DOCUMENTO`:  `nr_documento  = :nr_documento`
   - `COMBINACAO`: `cd_tns = ? AND cd_conta_contabil = ? AND cd_centro_custos = ? AND cd_origem_lcto = ?`
   - `REGRA_DEFINITIVA`: mesma chave de `COMBINACAO` (sem restringir mês/unidade).
3. Para `antes` use a linha calculada pela DRE; para `depois` subtraia o total dos
   lançamentos afetados de `linha_origem` e some em `linha_destino`.
4. `qtd_lancamentos_afetados` = `count(distinct nr_lancamento)` no escopo.

## 3. RPC `public.bi_dre_drill_realizado` — atualização

Adicionar `LEFT JOIN bi_dre_classificacoes c` aplicando, em ordem de prioridade:

1. `escopo='LANCAMENTO' AND status='ATIVO' AND c.nr_lancamento = l.nr_lancamento`
2. `escopo='DOCUMENTO'  AND status='ATIVO' AND c.nr_documento  = l.nr_documento`
3. `escopo='COMBINACAO' AND status='ATIVO' AND combo de chaves casa`
4. `escopo='REGRA_DEFINITIVA' AND status='APROVADO' AND combo de chaves casa`
5. Exceção legada `bi_dre_excecoes` (compatibilidade).

Use `COALESCE(c.codigo_linha_destino, e.codigo_linha_destino, reg.codigo_linha)`.

Importante:
- **Não** alterar `bi_dre_mascara`, `bi_dre_regras`, `bi_dre_estrutura`.
- **Não** criar regras automaticamente: o usuário precisa marcar o escopo
  `REGRA_DEFINITIVA` explicitamente, e a regra só passa a vigorar após
  `status='APROVADO'`.
- Tabela já criada via migração Lovable Cloud:
  `public.bi_dre_classificacoes` (enums `dre_classificacao_escopo`,
  `dre_classificacao_status`).
