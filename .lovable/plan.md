

## Adicionar testes — busca sem OP/Origem retorna todos os apontamentos

### Objetivo
Garantir, via testes automatizados, que ao clicar Pesquisar com OP e Origem vazios:
- O request sai sem `numorp` e sem `codori` na URL.
- Os demais filtros (`data_ini`, `data_fim`, `codpro`, `operador`, `status_op`, `somente_discrepancia`, `somente_acima_8h`) são enviados normalmente.
- A resposta do backend (mockada) com todos os apontamentos é refletida na tela.

### Arquivos

**1) `src/pages/__tests__/AuditoriaApontamentoGeniusPage.contract.test.tsx`** (estender)

Adicionar bloco `describe('busca ampla sem OP/Origem')` com casos:
- `buildAuditoriaListParams` com OP e Origem vazios + datas/produto/operador/status preenchidos → params contém `data_ini`, `data_fim`, `codpro`, `operador`, `status_op` e NÃO contém `numorp`/`codori`.
- `buildAuditoriaExportParams` com mesma entrada → idem, sem `pagina`/`tamanho_pagina`.
- Caso com somente datas (todos os outros vazios) → request mínimo viável, só `data_ini`/`data_fim` + flags 0/0 + paginação.

**2) `src/pages/__tests__/AuditoriaApontamentoGeniusPage.search.test.tsx`** (novo)

Teste de integração leve com `@testing-library/react`:
- Mock de `global.fetch` retornando `{ dados: [...3 apontamentos...], resumo: {...}, total: 3, pagina: 1, tamanho_pagina: 100 }`.
- Renderiza `<AuditoriaApontamentoGeniusPage />` envolvido em `MemoryRouter` + `QueryClientProvider` + `AuthContext` mock + `AiPageContext` mock conforme padrão do projeto (ver `KpiDeepSheet.test.tsx` para referência).
- Mantém OP e Origem vazios, mantém datas default, clica no botão "Pesquisar".
- Verifica que `fetch` foi chamado com URL contendo `/api/apontamentos-producao`, `data_ini=`, `data_fim=` e SEM `numorp=`/`codori=`.
- Verifica que as 3 linhas mockadas aparecem na tabela (`screen.findAllByRole('row')` ou checagem por número de OP retornado).

**3) Sem mudanças** em `src/lib/__tests__/api.test.ts` e `src/components/erp/__tests__/ExportButton.test.tsx` — já cobrem omissão de chaves vazias.

### Validação
`npx vitest run` → todos os testes passam (incluindo os novos).

### Detalhe técnico
- O teste de integração precisa inspecionar os providers usados em `App.tsx` para o wrapper. Se `KpiDeepSheet.test.tsx` já tem um helper de render, reusá-lo. Caso contrário, criar wrapper inline mínimo (Router + QueryClient).
- Se a página usar hooks que tocam Supabase no mount (ex.: `useAiPageContext`), mockar via `vi.mock('@/contexts/AiPageContext', ...)` retornando no-op.
- Mock de fetch deve casar tanto a chamada de listagem quanto qualquer chamada paralela de sugestões/opções (responder `{ dados: [] }` como fallback genérico).

