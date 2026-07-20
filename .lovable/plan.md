
## Contexto

Itens 1 a 5b desta versão já estão implementados e verificados em turnos anteriores (leitura de `resposta.op.*`, campos limpos de componente, "Depósito sugerido" como sugestão, autocompletes com `q`/`limit`, `POST /sid/requisitar-lote` com tratamento item-a-item e HTTP 400 propagando `detail`, rascunho apenas local). O último turno também passou a distinguir "backend inalcançável" (kind `inalcancavel`) de "SID desabilitado" (kind `desabilitado`) e adicionou warning em dev quando falta `VITE_API_BASE_URL`.

O delta real deste prompt está no **item 6** — separar 401 (sessão) dos demais erros e permitir revalidar o ping sob demanda.

## O que muda

### 1. Detectar 401 no `handleResponse` do módulo de requisições

Em `src/services/requisicoesApi.ts`, no `handleResponse`, tratar `res.status === 401` com uma nova classe `SessaoExpiradaError` (semelhante a `IntegracaoDesabilitadaError`), preservando o `detail` retornado.

### 2. Novo kind `sessao_expirada` no `useSidWriteEnabled`

Em `src/hooks/requisicoes/index.ts`:

- Ampliar `SidWriteKind` com `'sessao_expirada'`.
- Em `useSidWriteEnabled`, se `q.error instanceof SessaoExpiradaError` → retornar `kind: 'sessao_expirada'` com `reason: 'Sua sessão expirou. Faça login novamente.'`.
- Ordem final dos casos: `loading` → `sessao_expirada` → `desabilitado` (503/`IntegracaoDesabilitadaError`) → `inalcancavel` (outros erros) → `desconhecido` (sem data) → checagens de `sid_habilitado`/`wsdl_ok` → `ok`.

### 3. UI dos avisos com ação de retry e re-login

Em `src/components/requisicoes/IntegracaoOfflineBanner.tsx` e `src/components/requisicoes/IntegracaoStatusChip.tsx`:

- Renderizar uma variante extra para `kind === 'sessao_expirada'` (ícone `LogIn`, cor destacada, botão **"Fazer login"** que navega para `/login` mantendo o `redirect` para a rota atual).
- Adicionar um botão **"Tentar de novo"** em todos os estados de erro (`sessao_expirada`, `inalcancavel`, `desabilitado`, `desconhecido`) que chama `queryClient.invalidateQueries({ queryKey: ['requisicoes', 'sid', 'ping'] })` para forçar refetch imediato do `GET /sid/ping`.

Ajustar também o banner inline em `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` (linha 963) e o equivalente em `NovaRequisicaoAvulsaPage.tsx` para mostrar o texto correto por `kind` e o botão "Tentar de novo".

### 4. Revalidar ping ao entrar no passo de envio

O `useSidStatus` já faz `refetchOnWindowFocus: true` e `refetchInterval: 120_000` (foco da aba coberto). Falta forçar quando o usuário chega no passo final:

- Em `NovaRequisicaoOpPage.tsx` e `NovaRequisicaoAvulsaPage.tsx`, disparar `queryClient.invalidateQueries({ queryKey: ['requisicoes', 'sid', 'ping'] })` num `useEffect` que roda ao entrar na etapa "Revisar & enviar" (dependência: o índice/estado do passo atual). Assim uma aba antiga não fica com estado velho na hora de enviar.

### 5. Tabela final de exibição (implementada nos passos 2 e 3)

| Situação                            | kind             | Mensagem/UX                                                        |
|-------------------------------------|------------------|--------------------------------------------------------------------|
| `200` + `sid_habilitado: true`      | `ok`             | Chip "Habilitada", botão liberado                                  |
| `200` + `sid_habilitado: false` / 503 | `desabilitado`   | "Aguarde o SID ser habilitado no backend." + Tentar de novo        |
| `401`                               | `sessao_expirada`| "Sua sessão expirou. Faça login novamente." + botão Fazer login    |
| Erro de rede / 5xx / 404            | `inalcancavel`   | "Não foi possível falar com o servidor." + Tentar de novo          |

## Fora de escopo

Itens 1–5b (já entregues nos turnos anteriores) e o warning de fallback de `VITE_API_BASE_URL` (feito no turno anterior).
