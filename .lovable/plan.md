# Correções no backend FastAPI ETL

Trabalho 100% em documentação (`docs/`) — o backend FastAPI é externo e o time dele aplica as mudanças. Nenhuma alteração de frontend, migration ou edge function.

## Contexto do bug

Ao executar `ETL_V_BALANCO_PATRIMONIAL` (e demais ações que gravam em `bi_*`), a RPC `etl_carga_periodo` no Cloud responde:

> "Nenhuma coluna válida encontrada entre p_rows e public.bi_etl_v_balanco_patrimonial"

Causa: o ERP Senior devolve aliases em CAIXA ALTA (`ANOMES_REFERENTE`, `CD_EMPRESA`, `VL_SALDO`), mas as colunas reais em `public.bi_*` estão todas em minúsculo. A RPC compara chave a chave e descarta tudo.

## Observação importante sobre o item 5 do pedido

O usuário pede "buscar texto por `etl_acoes.codigo_acao`", mas essa coluna **não existe** — o schema real tem `id uuid` e `id_acao text` (já documentado em `docs/backend-etl-central.md`). Vou tratar a intenção (resolver textual robusto) usando `id_acao` (text) e `id` (uuid), mantendo a regra já vigente, e deixar isso explícito na doc para evitar confusão.

## Entregáveis

### 1. Novo arquivo `docs/backend-etl-normalizacao-rows.md`

Conteúdo:

- **Problema** com exemplo do erro real.
- **Função utilitária** a ser adicionada no módulo de ETL do FastAPI:

  ```python
  def normalizar_rows_supabase(rows: list[dict]) -> list[dict]:
      """Converte todas as chaves de cada row para lowercase antes de enviar à RPC etl_carga_periodo.
      O ERP Senior devolve aliases em CAIXA ALTA; as tabelas bi_* têm colunas em minúsculo."""
      if not rows:
          return rows
      return [
          { (k.lower() if isinstance(k, str) else k): v for k, v in row.items() }
          for row in rows
      ]
  ```

- **Ponto de aplicação**: imediatamente antes de **toda** chamada `supabase.rpc("etl_carga_periodo", { "p_tabela": ..., "p_rows": rows, ... })`.
- **Log temporário obrigatório** (remover depois de validar em prod):

  ```python
  if rows:
      logger.info("etl_carga_periodo rows[0]=%s keys=%s", rows[0], list(rows[0].keys()))
  ```

- **Checklist de aplicação** nas ações que hoje quebram: `VM_ORC_DRE`, `VM_LANC_CONTABIL`, `ETL_V_BALANCO_PATRIMONIAL`, e qualquer outra que use `etl_carga_periodo`.
- **Teste de fumaça** (curl) para `ETL_V_BALANCO_PATRIMONIAL` validando que `total_linhas > 0` e que não retorna mais "Nenhuma coluna válida encontrada".

### 2. Atualizar `docs/backend-etl-central.md`

Na seção "Resolução de `{acao_ref}`":

- Adicionar nota explícita: **"Não existe coluna `codigo_acao`. Se algum trecho do backend ainda referenciar `codigo_acao`, remover — o identificador textual é `id_acao` (text)."**
- Reforçar: `id_acao` é **text**, não bigint; comparar sempre `upper(id_acao) = upper(:ref)`; `id` é uuid e só casa quando `ref` é UUID válido.
- Acrescentar regra: ao ler atributos da ação resolvida, usar `acao.get("estrategia")` (e cair em `acao.get("estrategia_carga")` como fallback se ainda existir nesse backend) — **nunca** `acao.get("metodo_carga")`, que não existe no schema atual de `etl_acoes`.

### 3. Atualizar `docs/backend-etl-contabilidade.md`

- Apontar para o novo `docs/backend-etl-normalizacao-rows.md` na seção de troubleshooting.
- Trocar o aviso "⚠️ Bug conhecido" do 404 por uma nota dizendo que o 404 já foi coberto pelo resolver e que o erro atual ("Nenhuma coluna válida…") é resolvido pela normalização lowercase.

## Fora de escopo

- Nenhuma mudança em `src/lib/etl/api.ts`, `EtlTarefaDetalhePage.tsx`, `EditarSqlModal.tsx`, `ExecutarModal.tsx`.
- Nenhuma migration nem RPC nova — a `etl_carga_periodo` continua exigindo chaves minúsculas (o contrato do Cloud já está correto).
- Nenhuma alteração em edge functions Lovable.
