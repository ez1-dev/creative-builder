## Plano

Verificar e popular `sql_template` da ação `VM_FATURAMENTO` na tabela `public.etl_acoes` do Lovable Cloud, alinhando com o padrão já aplicado para `VM_FATURAMENTO_MANUAL`, `VM_FAT_CONTABIL` e `VM_FAT_TRB`.

### Passos

1. **Conferir estado atual** via `supabase--read_query`:
   - `SELECT id_acao, length(sql_template) FROM etl_acoes WHERE id_acao IN ('VM_FATURAMENTO','VM_FATURAMENTO_MANUAL','VM_FAT_CONTABIL','VM_FAT_TRB');`
2. **Localizar SQL canônico** de `VM_FATURAMENTO`:
   - Procurar em `docs/etl-sql/` (atualmente só existem os 3 manuais).
   - Se não houver arquivo, extrair o SQL do backend FastAPI ou pedir o conteúdo ao usuário.
3. **Criar arquivo canônico** `docs/etl-sql/SQL_VM_FATURAMENTO.sql` (fonte de verdade no repo).
4. **Migration** (`supabase--migration`) para `UPDATE public.etl_acoes SET sql_template = $sql$...$sql$ WHERE id_acao = 'VM_FATURAMENTO';` preservando placeholders `$[ANOMES_INI]` / `$[ANOMES_FIM]`.
5. **Atualizar `docs/etl-sql/README.md`** incluindo a nova linha na tabela de arquivos.
6. **Validar** com novo `read_query` confirmando `length(sql_template) > 0` e reexecutar a tarefa `ATU_COMERCIAL` no backend.

### Pergunta antes de executar

Não existe `docs/etl-sql/SQL_VM_FATURAMENTO.sql` no repositório. Para popular o `sql_template` preciso da origem do SQL:

- **(A)** Você cola aqui o SQL completo de `VM_FATURAMENTO` (do `app_unico.py` ou da fonte original).
- **(B)** A ação `VM_FATURAMENTO` deve ser **removida/desativada** porque foi substituída pelas 3 ações novas (manual / contábil / tributos).
- **(C)** Deixar `VM_FATURAMENTO` como está (SQL já vive no FastAPI, não precisa estar no Cloud).

Qual caminho?
