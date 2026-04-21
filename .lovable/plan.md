
## "Not Found" repetido em /sugestao-min-max

### Diagnóstico
O backend FastAPI **ainda não publicou** os endpoints novos documentados em `docs/backend-sugestao-minmax.md`:
- `GET /api/estoque/movimentacao`
- `GET /api/estoque/sugestao-politica`
- `POST /api/estoque/politica/salvar`

A cada clique em **Consultar movimentação** / **Gerar sugestão** / **Salvar política**, o ERP responde HTTP 404 com `{detail: "Not Found"}` e o `ApiClient` dispara `toast.error("Not Found")`. No replay aparecem 5 toasts em ~1s porque o usuário clicou várias vezes seguidas (a resposta 404 é instantânea, então `disabled={loading}` libera o botão entre cliques).

A IA (`Sugerir com IA`) também depende dos dados de movimentação, então não funciona enquanto o GET de movimentação devolver 404.

Não é bug de UI — é endpoint ausente. Mas dá para tornar o erro muito mais claro e evitar a enxurrada de toasts.

### Correção (frontend, sem tocar no backend)

**1. `src/pages/SugestaoMinMaxPage.tsx`** — UX resiliente:
- Detectar 404 em `fetchMovimentacao`/`fetchSugestao`/`salvarPolitica` (mensagem contém "Not Found" ou "404") e trocar o toast genérico por um aviso explicativo único:
  > *"Endpoint `/api/estoque/movimentacao` ainda não publicado no ERP. Veja `docs/backend-sugestao-minmax.md` para implementar."*
- Após receber 404 uma vez, marcar flag local `endpointMissing` e desabilitar os 4 botões (Consultar, Gerar, IA, Salvar) com tooltip "Backend ainda não publicado". Reativa ao trocar filtros (usuário pode tentar de novo).
- `toast.error` sempre com `id` fixo por endpoint para evitar empilhar toasts duplicados quando o usuário insiste no clique.

**2. `src/lib/api.ts`** — anexar `statusCode` na exceção lançada pelo `request()` (`err.statusCode = response.status`) para a página identificar 404 sem parsing frágil de string. Mantém compatibilidade com todas as outras telas (apenas adiciona campo no objeto Error).

**3. Banner informativo no topo da tela** (apenas quando `endpointMissing === true`):
- Alert amarelo (`variant="default"` com cor warning) acima do `PageHeader`:
  > *"Os endpoints de Sugestão Min/Max ainda não estão publicados no ERP. Esta tela ficará operacional assim que o backend implementar `/api/estoque/movimentacao`, `/api/estoque/sugestao-politica` e `/api/estoque/politica/salvar`."*
- Mantém o padrão visual `gestao-erros-conexao-erp`.

### O que NÃO muda
Backend, autenticação, edge function `sugestao-minmax-ia`, sidebar, rotas, permissões, `EstoqueMinMaxPage`, demais páginas. Quando o backend publicar os 3 endpoints, a tela passa a funcionar imediatamente — o banner some sozinho na primeira resposta de sucesso.

### Observação
Para a IA realmente sugerir políticas a partir de movimentação histórica, é obrigatório o endpoint `/api/estoque/movimentacao` retornar dados (a edge function `sugestao-minmax-ia` analisa o array de movimentações enviado pelo frontend). Documentação completa do contrato já está em `docs/backend-sugestao-minmax.md`.
