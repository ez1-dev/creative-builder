

## Status: aguardando publicação do backend

A tela `/auditoria-apontamento-genius` já está 100% pronta no frontend e seguirá em modo de espera até o ERP publicar `GET /api/auditoria-apontamento-genius`.

### O que já está entregue no frontend
- Filtros, KPIs, tabela com colunas de auditoria (`data_apontamento`, `hora_inicio`, `hora_fim`, `nome_usuario`, `horas_apontadas`).
- Drawer lateral ao clicar no número da OP com todos os apontamentos vinculados.
- Alerta amarelo automático quando o backend devolver OPs sem horas apontadas.
- Botão "Ver diagnóstico técnico" que mostra parâmetros enviados e contagem local mesmo sem bloco `debug` na resposta.
- Exportação Excel já apontando para o endpoint correto.

### O que depende do backend
Implementação de `GET /api/auditoria-apontamento-genius` (e `GET /api/export/auditoria-apontamento-genius`) conforme `docs/backend-auditoria-apontamento-genius.md`, com atenção a:
- Filtro fixo de origens GENIUS (lista a partir de `110`).
- `LEFT JOIN` correto com `E930MPR` para popular `hora_inicio`, `hora_fim`, `nome_usuario`, `data_apontamento`.
- Cálculo de `horas_apontadas` tratando HHMM em minutos.
- Bloco `debug` na resposta enquanto a investigação estiver ativa.
- `status_op` derivado de `E900COP.SITPRO` (`E/L/A/F/C`).

### Próximo passo
Nenhuma alteração de código necessária neste repositório agora. Assim que o endpoint for publicado no ERP, basta recarregar a tela — os dados aparecerão automaticamente e o alerta amarelo / botão de diagnóstico continuarão disponíveis caso ainda haja inconsistências para investigar.

