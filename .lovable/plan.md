

## Alinhar tela ao novo contrato `/api/auditoria-apontamento-genius`

### Diagnóstico
O backend foi corrigido para devolver os campos que a tela já consome (`status_op`, `status_apontamento`, `total_ops_andamento`, `total_ops_finalizadas`, etc.). Isso resolve a divergência de contrato. Falta apenas garantir que o frontend está enviando os filtros com os nomes/valores que o novo endpoint espera e ajustar o painel de diagnóstico, que hoje aciona em qualquer resposta vazia mesmo quando o backend não devolve `debug`.

### Ajustes no frontend

**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. **Filtro `status_op`** — garantir envio dos valores aceitos pelo novo backend: `TODOS | EM_ANDAMENTO | FINALIZADO | SEM_STATUS`. Remover o envio de códigos nativos (`E/L/A/F/C`) na query — o mapeamento agora é feito no SQL via `SITORP`. O Select do filtro permanece com as 4 opções agrupadas.

2. **Parâmetros enviados** — confirmar nomes exatos esperados pelo endpoint:
   - `data_ini`, `data_fim`, `numero_op`, `origem`, `codigo_produto`, `operador`, `status_op`, `somente_discrepancia`, `somente_maior_8h`, `pagina`, `tamanho_pagina`.
   
3. **Painel de diagnóstico** — só renderizar `DiagnosticoApontGeniusCard` quando `data.debug` existir. Remover o gatilho de "vazio sem debug" (o backend novo não envia `debug`, então o card ficaria sempre visível mostrando uma tela técnica desnecessária).

4. **Empty state** — quando `dados.length === 0` e não houver `debug`, voltar a exibir alerta amigável "Sem registros para o período/filtros aplicados", já que o backend agora é confiável.

5. **Resumo** — manter leitura do `resumo` retornado pelo backend (`total_ops_andamento`, `total_ops_finalizadas`, `total_discrepancias`, `total_sem_inicio`, `total_sem_fim`, `total_fim_menor_inicio`, `total_apontamento_maior_8h`, `total_operador_maior_8h_dia`, `maior_total_dia_operador`). Se algum KPI já lê de outra chave, normalizar para os nomes acima.

### Ajuste em `src/lib/api.ts`
- Atualizar o tipo `AuditoriaApontamentoGeniusResponse.resumo` para refletir as chaves reais do novo backend (acrescentar `total_ops_andamento`, `total_ops_finalizadas`, `total_apontamento_maior_8h`, `total_operador_maior_8h_dia`, `maior_total_dia_operador`).
- Manter `debug` como opcional (continua útil enquanto o backend antigo não foi propagado a todos os ambientes).

### Fora de escopo
- Backend (já entregue pelo usuário).
- Sidebar, rota, autenticação, exportação (URL e parâmetros já corretos).
- Lógica de status do apontamento na tabela (já alinhada: ABERTO/FECHADO/DIVERGENTE/SEM_APONTAMENTO).

### Resultado
Tela `/auditoria-apontamento-genius` consumindo o novo contrato sem divergências: KPIs preenchidos, status corretos, empty state limpo quando realmente não houver dados, e diagnóstico técnico aparecendo apenas quando o backend explicitamente enviar `debug`.

