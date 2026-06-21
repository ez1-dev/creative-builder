## Corrigir trigger de updated_at em etl_agendamentos

A tabela usa `atualizado_em`, mas o trigger anexado é o `update_updated_at_column()` genérico, que escreve em `NEW.updated_at` — coluna que não existe. Por isso qualquer UPDATE (inclusive ao clicar em "Executar agora" ou alternar Ativo) falha com `record "new" has no field "updated_at"`.

### Migração
- Remover o trigger `etl_agendamentos_set_updated_at`.
- Ajustar `etl_agendamentos_before_save()` para também setar `NEW.atualizado_em = now()` em todas as operações (já o faz parcialmente; garantir incondicional).

Nenhuma mudança de frontend é necessária.
