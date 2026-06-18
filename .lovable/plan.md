## Objetivo
Autenticar as chamadas do módulo DRE Configurável usando o mesmo cliente das demais rotas (`api.get` de `src/lib/api.ts`), eliminando os `fetch` diretos e tratando `401 / Not authenticated` com mensagem "Sessão expirada".

## Arquivo alterado
`src/lib/bi/dreConfiguravelApi.ts`

### Mudanças
1. Remover `authHeaders()` e os `fetch(...)` manuais.
2. Reescrever `fetchDreRealizadoResumo` e `fetchDreModelos` usando o cliente compartilhado:
   ```ts
   import { api } from '@/lib/api';
   ...
   const data = await api.get<any>('/api/dre/realizado/resumo', {
     empresa: filtros.empresa || undefined,
     filial: filtros.filial || undefined,
     data_ini: filtros.data_ini,
     data_fim: filtros.data_fim,
     modelo_id: filtros.modelo_id || undefined,
     tipo: filtros.tipo ?? 'MENSAL',
     comparar_orcamento: !!filtros.comparar_orcamento,
   });
   ```
   O `api.get` já adiciona `Authorization: Bearer <token>`, `Content-Type` e `ngrok-skip-browser-warning`, e converte `401` em erro com `statusCode = 401`.
3. Envolver as chamadas em `try/catch` e, quando `err.statusCode === 401` **ou** a mensagem contiver `"Not authenticated"`, relançar um erro padronizado: `new Error('Sessão expirada. Faça login novamente.')` com `statusCode = 401`.
4. Manter `normalizarTotais` / `normalizarMensal` / `toNumberBI` inalterados.

### Tratamento de sessão expirada na UI
`src/pages/bi/financeiro/DreConfiguravelPainelPage.tsx`:
- No bloco de erro do `resumoQ`, detectar `(error as any)?.statusCode === 401` e exibir o `ErrorState` com título "Sessão expirada" e botão "Ir para login" que faz `window.location.assign('/login')`. Para os demais erros, manter o comportamento atual (Retry).
- Mesmo tratamento aplicado a `modelosQ` quando o carregamento de modelos falhar por 401 (mensagem inline acima dos filtros, sem quebrar a tela).

## Fora de escopo
- Não alterar `src/lib/api.ts`.
- Não mexer em `dreDinamicaApi.ts`, `dreMontadorApi.ts` ou outros módulos DRE.
- Sem mudanças de layout, filtros, gráfico ou tabela.

## Critério de aceite
- DevTools → Network: `GET /api/dre/modelos` e `GET /api/dre/realizado/resumo` saem com header `Authorization: Bearer <token>` e `ngrok-skip-browser-warning: true`.
- Sem chamadas `fetch` diretas em `dreConfiguravelApi.ts`.
- Resposta `401` ou `{"detail":"Not authenticated"}` exibe "Sessão expirada" com ação para login, em vez de mensagem genérica.