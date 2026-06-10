# PATCH FastAPI — `/api/faturamento-genius/atualizar`

> **Problema reportado pelo frontend (Lovable):**
> ```
> 500 — Ação ETL não encontrada: ATU_COMERCIAL
> ```
>
> **Causa raiz:** o handler atual de `POST /api/faturamento-genius/atualizar`
> está chamando `executar_acao("ATU_COMERCIAL")`. `ATU_COMERCIAL` **não é uma
> ação** — é uma **tarefa** (`public.etl_tarefas`) que orquestra 4 ações.

---

## 1. Modelo correto no Cloud

`public.etl_tarefas` (já existente):

| id | nome_tarefa     | codigo_tarefa   | ativa | status_atual |
|----|-----------------|-----------------|-------|--------------|
| 2  | ATU_COMERCIAL   | ATU_COMERCIAL   | true  | CONCLUIDO    |

`public.etl_acoes` vinculadas à tarefa 2 (ordem importa):

| ordem | id_acao                 | ativa |
|------:|-------------------------|-------|
| 1     | VM_FATURAMENTO          | true  |
| 2     | VM_FATURAMENTO_MANUAL   | true  |
| 3     | VM_FAT_CONTABIL         | true  |
| 4     | VM_FAT_TRB              | true  |

**Regra de negócio:** executar `ATU_COMERCIAL` ⇒ executar as 4 ações na ordem,
respeitando `etl_acoes.caso_erro` (ABORTAR vs CONTINUAR).

---

## 2. Contrato esperado

### Request
```
POST /api/faturamento-genius/atualizar
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "anomes_ini": "202606",
  "anomes_fim": "202606"
}
```

Aceitar payload **case-insensitive** (`ANOMES_INI`/`anomes_ini`). Validar
formato `AAAAMM` (6 dígitos numéricos).

### Response (sucesso)
```json
{
  "execucao_id": "uuid",
  "status": "EM_EXECUCAO",
  "mensagem": "ATU_COMERCIAL iniciada para 202606→202606"
}
```

### Response (não aplicável)
```json
{ "aplicavel": false, "message": "Atualização comercial não se aplica neste ambiente." }
```

---

## 3. Algoritmo correto (substitui o atual)

```python
async def atualizar_faturamento_genius(payload: AtualizarBody, user: User):
    ini = _normaliza_anomes(payload.anomes_ini)   # int 6 dígitos
    fim = _normaliza_anomes(payload.anomes_fim)

    # 1) Localiza a TAREFA (NÃO a ação)
    tarefa = await cloud.fetch_one(
        """
        SELECT id, nome_tarefa
          FROM public.etl_tarefas
         WHERE (codigo_tarefa = :nome OR nome_tarefa = :nome)
           AND ativa = true
         LIMIT 1
        """,
        {"nome": "ATU_COMERCIAL"},
    )
    if not tarefa:
        raise HTTPException(404, "Tarefa ATU_COMERCIAL não cadastrada")

    # 2) Delega ao orquestrador de tarefa já existente.
    #    NUNCA chamar executar_acao("ATU_COMERCIAL").
    return await executar_tarefa(
        nome_tarefa=tarefa["nome_tarefa"],
        params={
            "anomes_ini": ini,
            "anomes_fim": fim,
            "acionado_por": user.login or "MANUAL",
            "parametros": {"anomes_ini": ini, "anomes_fim": fim},
        },
    )
```

Onde `executar_tarefa(...)` é o **mesmo** método usado por
`POST /api/etl/tarefas/{nome}/executar` — ele já:

1. cria 1 linha em `public.etl_execucoes` (status `EM_EXECUCAO`);
2. itera `etl_acoes WHERE tarefa_id = :id AND ativa = true ORDER BY ordem`;
3. cria 1 linha em `public.etl_acao_execucoes` por ação;
4. substitui `$[ANOMES_INI]` / `$[ANOMES_FIM]` no `comando_sql`;
5. respeita `caso_erro` (ABORTAR encerra, CONTINUAR segue);
6. fecha `etl_execucoes` com `SUCESSO`/`ERRO`.

---

## 4. Guardas defensivas (recomendado)

No `executar_acao(id_acao)`, blindar contra chamada errada:

```python
TAREFAS_RESERVADAS = {"ATU_COMERCIAL", "ATUALIZACAO_COMERCIAL"}

if id_acao.upper() in TAREFAS_RESERVADAS:
    raise HTTPException(
        400,
        f"{id_acao} é uma tarefa; use POST /api/etl/tarefas/{id_acao}/executar",
    )
```

E garantir que a mensagem de erro 404 do `executar_acao` seja específica:
`"Ação ETL não encontrada: {id_acao}"` está OK, mas o caso ATU_COMERCIAL
nunca deveria chegar lá depois deste patch.

---

## 5. Validação no Cloud (queries de aceite)

Depois da chamada `POST /api/faturamento-genius/atualizar`:

```sql
-- (a) Uma linha NOVA em etl_execucoes referenciando a tarefa 2
SELECT id, nome_tarefa, status, parametros, iniciado_em, finalizado_em
  FROM public.etl_execucoes
 WHERE nome_tarefa = 'ATU_COMERCIAL'
 ORDER BY criado_em DESC
 LIMIT 1;

-- (b) 4 linhas em etl_acao_execucoes, na ordem cadastrada
SELECT id_acao, ordem, status, total_linhas, iniciado_em, finalizado_em
  FROM public.etl_acao_execucoes
 WHERE execucao_id = '<id da query acima>'
 ORDER BY ordem;
-- Esperado:
-- 1 VM_FATURAMENTO          SUCESSO
-- 2 VM_FATURAMENTO_MANUAL   SUCESSO
-- 3 VM_FAT_CONTABIL         SUCESSO
-- 4 VM_FAT_TRB              SUCESSO
```

---

## 6. Critérios de aceite

- [ ] Clicar em **Atualizar Comercial** no `/faturamento-genius` **não** retorna mais `Ação ETL não encontrada: ATU_COMERCIAL`.
- [ ] `POST /api/faturamento-genius/atualizar` cria 1 linha em `etl_execucoes` com `nome_tarefa = 'ATU_COMERCIAL'`.
- [ ] Cria 4 linhas em `etl_acao_execucoes` (VM_FATURAMENTO, VM_FATURAMENTO_MANUAL, VM_FAT_CONTABIL, VM_FAT_TRB) na ordem 1→4.
- [ ] `POST /api/etl/tarefas/ATU_COMERCIAL/executar` continua funcionando (mesmo orquestrador).
- [ ] `POST /api/etl/acoes/ATU_COMERCIAL/executar` retorna 400 com mensagem orientando usar o endpoint de tarefa.

---

## 7. Notas para o frontend (sem mudança de contrato)

O frontend (`src/pages/FaturamentoGeniusPage.tsx`) já chama o endpoint
correto (`/api/faturamento-genius/atualizar`). Após o patch, basta o backend
delegar para `executar_tarefa`. Nenhum ajuste de URL/payload é necessário do
lado Lovable.
