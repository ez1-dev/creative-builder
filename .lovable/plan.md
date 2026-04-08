
## Objetivo

Corrigir a tela **Dashboard Produção** para que ela não fique presa em “Carregando...” e exiba um estado claro quando a API não responder, responder vazia ou responder em formato diferente do esperado.

## Diagnóstico provável

Pelo código atual, há dois pontos frágeis em `ProducaoDashboardPage.tsx`:

1. A busca depende de **uma única chamada pesada** para `/api/producao/dashboard`.
2. A tela **só renderiza conteúdo se `data.resumo` existir**. Se a API:
   - demorar demais,
   - retornar estrutura diferente,
   - ou retornar sem `resumo`,
   
   o usuário fica vendo apenas loading ou uma área vazia, sem diagnóstico visível.

Além disso, o fluxo atual não tem:
- timeout de requisição,
- cancelamento da busca anterior,
- estado explícito de “sem dados”,
- estado explícito de “falha/timeout”.

## Plano de implementação

### 1. Tornar a chamada do dashboard resiliente
- Adicionar controle de requisição no `search`:
  - cancelar busca anterior ao pesquisar novamente,
  - impedir que respostas antigas sobrescrevam a busca atual,
  - encerrar loading corretamente em timeout/erro.

### 2. Normalizar a resposta da API antes de renderizar
- Criar uma camada de normalização no `ProducaoDashboardPage` para aceitar:
  - resposta com `resumo`,
  - resposta parcial,
  - arrays ausentes (`top_projetos_patio`, `cargas_por_mes`),
  - valores nulos/undefined.
- Garantir defaults seguros para evitar tela vazia.

### 3. Melhorar estados visuais da página
Separar claramente os cenários:
- **loading**: consulta em andamento,
- **error/timeout**: mostrar alerta com mensagem objetiva e ação de tentar novamente,
- **empty**: filtros sem resultado,
- **success**: KPIs e gráficos.

Hoje a página só trata loading + sucesso parcial.

### 4. Dar feedback útil ao usuário
- Se a consulta exceder o tempo esperado, mostrar mensagem como:
  - “A consulta do dashboard está demorando mais que o normal. Tente refinar os filtros.”
- Se a API retornar sem `resumo`, mostrar:
  - “O dashboard não recebeu dados consolidados para estes filtros.”

### 5. Revisar consistência com o restante do módulo Produção
- Aplicar o mesmo padrão de robustez já usado nas páginas paginadas:
  - controle de corrida entre buscas,
  - tratamento claro de erro,
  - renderização resiliente.
- Não alterar a lógica dos KPIs consolidados das outras páginas agora, apenas alinhar o comportamento do dashboard.

## Detalhes técnicos

### Arquivos principais
- `src/pages/producao/ProducaoDashboardPage.tsx`
- `src/lib/api.ts` (se o timeout/cancelamento for centralizado no client)

### Ajustes técnicos previstos
- Introduzir `AbortController` e/ou identificador de requisição ativa.
- Criar helper de normalização, por exemplo:
  - `normalizeDashboardData(result)`
- Adicionar estados extras no componente:
  - `error`
  - `empty`
  - possivelmente `requestStatus`
- Renderizar fallback quando:
  - `data` existe mas `resumo` não existe,
  - `resumo` existe com todos os valores zerados,
  - gráficos vierem vazios.

## Resultado esperado

Ao pesquisar por `Projeto 663 / Desenho 4200`, a tela deverá:
- parar de ficar indefinidamente em “Carregando...”,
- informar claramente se houve timeout, erro ou ausência de dados,
- renderizar os KPIs/gráficos quando a API retornar corretamente,
- evitar sensação de travamento silencioso.

## Validação

### Cenários para validar
1. Busca com retorno normal.
2. Busca com filtros sem resultado.
3. Busca lenta.
4. Busca interrompida por nova pesquisa.
5. Resposta sem `resumo`.
6. Navegar para outra página durante loading sem deixar estado quebrado.

### Critério de aceite
- Nunca ficar preso em loading indefinidamente.
- Sempre exibir um estado visível: sucesso, erro, timeout ou sem dados.
- Dashboard continuar compatível com o contrato atual da API, mas mais tolerante a respostas incompletas.
