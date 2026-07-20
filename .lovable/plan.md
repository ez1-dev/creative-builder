## Problema

Em `/rh` os cards aparecem em branco (só o ícone). A rota chama `fetchMenuRh()` (`GET /api/rh/menu`) do backend e, quando esse retorno vem com `titulo`/`descricao` vazios ou com nomes de campo diferentes, o `RhIndexPage` renderiza um card sem texto porque só usa o array do backend quando ele tem `length > 0` — o `FALLBACK` local (que tem os títulos corretos) é ignorado por completo.

## Correção (frontend apenas)

Ajustar `src/pages/rh/RhIndexPage.tsx` para **mesclar** o retorno do backend com o `FALLBACK` em vez de trocar um pelo outro:

1. Sempre partir do `FALLBACK` como base (garante título, rota, ícone e ordem conhecidos).
2. Para cada item retornado pelo backend, casar por `codigo` e sobrescrever apenas os campos não vazios (`titulo`, `descricao`, `rota`).
3. Itens novos vindos do backend (código desconhecido) entram no fim, usando `ROTA_POR_CODIGO` / ícone default quando faltar dado.
4. Fallback extra em runtime: se após a mescla o `titulo` continuar vazio, usar o do `FALLBACK` correspondente ou o `codigo` como último recurso, para o card nunca ficar totalmente vazio.
5. Não alterar `fetchMenuRh`, nem o header, nem o layout — apenas a montagem da lista `items`.

Sem mudanças de backend, permissões ou tokens de design.

## Como validar

- Abrir `/rh` — os 8 cards do `FALLBACK` (Resumo Folha, Quadro Colaboradores, Contrato Experiência, Programação de Férias, Turnover, Absenteísmo, Relatório Gerencial, Formulários) aparecem com título e navegam para a rota correta.
- Simular backend devolvendo lista vazia ou itens sem `titulo`: cards continuam legíveis.
