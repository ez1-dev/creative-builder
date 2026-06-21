## Diagnóstico

O resultado `Tick disparado — 0 agendamento(s) processado(s)` está coerente para o botão **Verificar pendentes**: no banco há 1 agendamento ativo (`ATU_COMERCIAL`), mas a próxima execução está no futuro, então ele não está vencido.

O ponto frágil é o botão **Executar agora**: ele força a execução indiretamente atualizando `proxima_execucao_em` para “agora” e depois chama o mesmo tick. Isso depende de horário/trigger/atualização antes da chamada e pode continuar retornando 0.

## Plano

1. Ajustar a função `etl-agendamentos-tick`
   - Manter o comportamento atual quando chamada sem parâmetros: processar somente agendamentos vencidos.
   - Aceitar um payload opcional para execução manual, por exemplo `{ agendamento_id, forcar: true }`.
   - Quando esse payload vier, buscar e processar exatamente aquele agendamento ativo, mesmo que a próxima execução esteja no futuro.
   - Reagendar normalmente a próxima execução após concluir.

2. Ajustar a API frontend de agendamentos
   - Permitir chamar o tick com um `agendamento_id` específico para execução manual.
   - Manter o botão global usando o tick sem parâmetros.

3. Ajustar a aba de Agendamentos
   - Botão **Verificar pendentes** continua mostrando 0 quando nada está vencido.
   - Botão **Executar agora** passa a chamar a execução manual direta, sem alterar `proxima_execucao_em` antes.
   - Toast de execução manual mostra o resultado do agendamento selecionado.

4. Validar
   - Chamar a função com `agendamento_id` e confirmar que retorna `processados: 1` para o agendamento ativo.
   - Confirmar que a coluna “Último status” e “Próxima execução” são atualizadas após a execução.