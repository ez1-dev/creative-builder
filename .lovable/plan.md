

## Garantir colunas de auditoria visíveis na tabela

### Escopo
Verificar e ajustar a definição de colunas da tabela em `src/pages/AuditoriaApontamentoGeniusPage.tsx` para que as colunas abaixo apareçam explicitamente, permitindo conferir visualmente os campos retornados pelo backend:

- `data_apontamento` — Data
- `hora_inicio` — Hora Início
- `hora_fim` — Hora Fim
- `nome_usuario` — Operador

### Ajustes
**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. Revisar o array `columns` do `DataTable`:
   - garantir entrada para `data_apontamento` (formatada como data BR; vazio → "—");
   - garantir `hora_inicio` e `hora_fim` (mostrar valor cru "HH:MM" ou "—" quando vazio, sem ocultar zeros);
   - garantir `nome_usuario` (com fallback para `codigo_usuario` quando nome vier vazio, mostrando "— (cód: 0)");
   - manter `horas_apontadas` já existente, exibindo `0,00` em vermelho quando zero para destacar o problema.

2. Posicionar essas colunas logo após `numero_op` / `origem`, antes das colunas de status, para facilitar conferência lado a lado.

3. Atualizar o `enableSearch` da `DataTable` para considerar também `nome_usuario` e `data_apontamento` na busca rápida (já feito para `nome_usuario`; confirmar `data_apontamento`).

4. Sem alterar lógica de fetch, filtros, KPIs, alerta amarelo de "todos zerados", botão de diagnóstico técnico ou ordenação por `horas_apontadas > 0`.

### Fora de escopo
- Backend / SQL.
- Tipos em `src/lib/api.ts` (campos já existem no contrato).
- Exportação Excel (já inclui esses campos).

### Resultado
A tabela passa a exibir explicitamente Data, Hora Início, Hora Fim e Operador em todas as linhas, tornando óbvio quais registros vieram sem apontamento real do backend (todos os campos vazios) e quais têm dados parciais.

