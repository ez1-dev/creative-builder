## Botão "Executar agora" por agendamento

Hoje o "Rodar pendentes agora" só processa agendamentos cuja `proxima_execucao_em` já venceu — por isso retornou 0. Vou adicionar uma ação por linha que dispara a execução imediatamente, sem alterar o ciclo normal.

### Mudanças

**Frontend (`src/components/etl/AgendamentosTab.tsx`):**
- Novo botão ▶ "Executar agora" em cada linha da tabela de agendamentos.
- Ao clicar:
  1. `UPDATE etl_agendamentos SET proxima_execucao_em = now() WHERE id = …` (apenas se ativo).
  2. Chama a edge function `etl-agendamentos-tick` (reaproveita o mesmo fluxo, garantindo que o `ultimo_status`/`ultima_mensagem` sejam preenchidos e a próxima execução real seja recalculada normalmente).
  3. Toast com o resultado retornado para aquele agendamento.

**Coluna "Próxima execução":**
- Adicionar texto auxiliar "em X min" / "em X h" para deixar claro quando rodará automaticamente.

**Texto do botão global:**
- Renomear "Rodar pendentes agora" para "Verificar pendentes agora" e adicionar tooltip explicando que só processa agendamentos vencidos.

Nada muda no backend nem no FastAPI.
