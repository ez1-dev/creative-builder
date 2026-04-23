

## Limpeza automática semanal de logs antigos

### Diagnóstico
A tela `/configuracoes` (aba "Logs de Erros") mostra 29 registros acumulados na tabela `error_logs`. O usuário quer que logs antigos sejam removidos automaticamente toda semana, sem precisar limpar manualmente.

Hoje não existe nenhum job agendado no banco. As extensões `pg_cron` e `pg_net` precisam ser habilitadas para rodar tarefas recorrentes no Postgres.

### Decisão de retenção
Vou assumir **retenção de 7 dias** (apaga tudo com mais de 1 semana, roda toda segunda-feira às 03:00). Se preferir outro período (15/30 dias) ou outra frequência, é só dizer antes de aprovar.

### Mudança 1 — Migração (schema/extensões/função)
Criar via tool de migração:

1. Habilitar extensões:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```
2. Função `SECURITY DEFINER` que apaga logs antigos:
   ```sql
   CREATE OR REPLACE FUNCTION public.cleanup_old_error_logs()
   RETURNS void
   LANGUAGE sql
   SECURITY DEFINER
   SET search_path = public
   AS $$
     DELETE FROM public.error_logs
     WHERE created_at < now() - interval '7 days';
   $$;
   ```

### Mudança 2 — Agendamento (via insert tool, não migração)
Conforme orientação da plataforma, `cron.schedule` vai por insert tool:
```sql
SELECT cron.schedule(
  'cleanup-error-logs-weekly',
  '0 3 * * 1',  -- toda segunda 03:00
  $$ SELECT public.cleanup_old_error_logs(); $$
);
```

### Mudança 3 — UI (opcional, mesma tela)
Em `src/pages/ConfiguracoesPage.tsx`, na aba "Logs de Erros", adicionar uma nota discreta abaixo do título:
> "Logs com mais de 7 dias são removidos automaticamente toda segunda-feira às 03:00."

Sem alterar a tabela, filtros ou botão de limpar manual existente.

### Fora de escopo
- Painel para configurar o período de retenção pela UI.
- Exportar logs antes de apagar.
- Limpar outros tipos de log (auth, edge functions).

### Resultado
A tabela `error_logs` é limpa automaticamente toda semana, mantendo só os últimos 7 dias. O usuário não precisa mais clicar em "limpar" manualmente.

