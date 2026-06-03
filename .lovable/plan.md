## Contexto

O erro vem do FastAPI: a constante `SQL_VM_FATURAMENTO_MANUAL` em `app_unico.py` (dentro do dicionário `ETL_SQL_TEMPLATES`) está vazia. O SQL completo (≈420 linhas) já existe neste repositório em `docs/etl-sql/SQL_VM_FATURAMENTO_MANUAL.sql`, mas ainda não foi copiado para o backend.

O mesmo provavelmente vale para `SQL_VM_FAT_CONTABIL` e `SQL_VM_FAT_TRB`, que também têm os `.sql` prontos em `docs/etl-sql/`.

## Plano (a ser executado no backend FastAPI, fora do Lovable)

1. Abrir `app_unico.py` no projeto FastAPI.
2. Localizar o dicionário `ETL_SQL_TEMPLATES` (criado no passo anterior).
3. Substituir o valor das 3 chaves pelos SQLs completos dos arquivos:
   - `SQL_VM_FATURAMENTO_MANUAL` ← `docs/etl-sql/SQL_VM_FATURAMENTO_MANUAL.sql`
   - `SQL_VM_FAT_CONTABIL` ← `docs/etl-sql/SQL_VM_FAT_CONTABIL.sql`
   - `SQL_VM_FAT_TRB` ← `docs/etl-sql/SQL_VM_FAT_TRB.sql`
4. Usar string literal Python com aspas triplas (`r""" ... """`) para preservar `$[ANOMES_INI]` / `$[ANOMES_FIM]` sem escape.
5. Reiniciar o FastAPI e reexecutar:
   ```
   POST /api/etl/tarefas/ATU_COMERCIAL/executar
   { "parametros": { "ANOMES_INI": "202606", "ANOMES_FIM": "202606" } }
   ```

### Alternativa (sem mexer no código do backend)

Salvar o SQL diretamente no campo `comando_sql` (ou `sql_template`) de cada ação em `public.etl_acoes` via UI de ETL → "Editar SQL". O backend deve usar esse SQL persistido quando a constante estiver vazia. Posso aplicar isso pelo Lovable Cloud se preferir esse caminho.

## Pergunta

Quer que eu:
- **(A)** apenas confirme os caminhos dos `.sql` e você mesmo cola no `app_unico.py`, ou
- **(B)** grave os 3 SQLs diretamente em `etl_acoes.sql_template` no Cloud (via migration) — assim o backend pega de lá sem precisar redeploy?
