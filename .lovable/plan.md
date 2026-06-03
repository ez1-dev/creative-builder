## Plano — popular `VM_FATURAMENTO` no Cloud

Usar o SQL anexado (`user-uploads://VM_FATURAMENTO.txt`, 515 linhas) como fonte de verdade.

### Passos

1. **Criar arquivo canônico** `docs/etl-sql/SQL_VM_FATURAMENTO.sql` copiando o conteúdo de `/mnt/user-uploads/VM_FATURAMENTO.txt` literalmente (UTF-8, sem reformatar, preservando `$[ANOMES_INI]` / `$[ANOMES_FIM]`).
2. **Migration** (`supabase--insert`) `UPDATE public.etl_acoes SET sql_template = $sql$...$sql$ WHERE id_acao = 'VM_FATURAMENTO'`.
3. **Atualizar `docs/etl-sql/README.md`** incluindo a nova linha na tabela de arquivos (remover o aviso de que ainda não foi extraído).
4. **Validar** com `SELECT id_acao, length(sql_template), sql_versao FROM etl_acoes WHERE id_acao IN ('VM_FATURAMENTO','VM_FATURAMENTO_MANUAL','VM_FAT_CONTABIL','VM_FAT_TRB');` confirmando 4 ações com `sql_template` populado.

### Observação

O conteúdo enviado termina no `WHERE` da 3ª `UNION ALL` (linha 515 conforme preview truncado). Vou ler o arquivo completo de `/mnt/user-uploads/VM_FATURAMENTO.txt` antes de salvar — se houver fechamento adicional, será incluído integralmente.

Confirma para eu executar?
