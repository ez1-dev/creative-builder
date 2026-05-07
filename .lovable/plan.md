# Diagnóstico — Por que widgets não aparecem nas páginas

## O que verifiquei

1. **Tabela `bi_user_widgets` está vazia** (`SELECT * → 0 rows`). Nenhum widget chegou a ser salvo no banco — não é problema de exibição, é problema de **gravação**.
2. **RLS está correta**: insert exige `auth.uid() = user_id`. Se o usuário não estiver logado, o insert é silenciosamente bloqueado e o `ApplyComponentDialog` desabilita o botão (`authed === false → canSave=false`).
3. **A rota `/biblioteca-bi` agora é pública** (sem `ProtectedRoute`) — então o usuário consegue abrir o catálogo **deslogado**, clicar em "Aplicar componente", e o botão "Aplicar à página" fica desabilitado com um banner amarelo discreto. Provavelmente passou despercebido.
4. **Apenas 3 páginas hoje renderizam `<UserWidgetsSlot/>`**:
   - `/painel-compras`
   - `/notas-recebimento`
   - `/producao/dashboard`
   
   Páginas como Estoque, Faturamento Genius, Contas a Pagar/Receber, Auditoria, Min/Max etc. **não têm slot nenhum** — mesmo que o widget fosse salvo, não apareceria lá.
5. O `PAGE_REGISTRY` (lista de páginas-alvo no diálogo "Aplicar") só conhece as 3 páginas acima — então não é possível aplicar widget em mais nenhuma página.

## O que vou implementar

### 1. Tornar a falha de autenticação inescapável no diálogo
Em `ApplyComponentDialog.tsx`:
- Quando `authed === false`, substituir o banner amarelo por um **bloco grande vermelho** com botão "Entrar agora" que redireciona para `/login?redirect=/biblioteca-bi`.
- Trocar o texto do botão "Aplicar à página" para **"Faça login para aplicar"** quando bloqueado por auth (em vez de só desabilitar).

### 2. Expandir o `PAGE_REGISTRY` com mais páginas-alvo
Adicionar em `src/lib/bi/pageRegistry.ts`:
- `faturamento-genius` (KPIs faturado/meta/variação + séries por mês/cliente)
- `estoque-min-max` (KPIs estoque atual/mín/máx + tabela de itens)
- `contas-pagar` (KPIs total/vencidas/a vencer + séries)
- `auditoria-apontamento-genius` (KPIs e tabela)

### 3. Embrulhar essas páginas com `<PageDataProvider>` + `<UserWidgetsSlot>`
Adicionar nas 4 páginas acima:
- `<PageDataProvider pageKey="..." kpis={...} series={...} rows={...} filtros={filters}>` ao redor do conteúdo.
- `<UserWidgetsSlot section="kpis" cols={4} />` após o `KpiGrid` existente.
- `<UserWidgetsSlot section="charts" cols={3} emptyHint={false} />` após os gráficos.

### 4. Confirmar funcionamento end-to-end
Após o build:
- Logar como usuário, abrir `/biblioteca-bi`, aplicar 1 KPI em "Faturamento Genius".
- Abrir `/faturamento-genius` e confirmar que o widget aparece.
- Verificar via SQL que o registro entrou em `bi_user_widgets`.

## Arquivos editados

- `src/components/bi/runtime/ApplyComponentDialog.tsx` — bloqueio de auth mais visível.
- `src/lib/bi/pageRegistry.ts` — +4 páginas-alvo.
- `src/pages/FaturamentoGeniusPage.tsx`
- `src/pages/EstoqueMinMaxPage.tsx`
- `src/pages/ContasPagarPage.tsx`
- `src/pages/AuditoriaApontamentoGeniusPage.tsx`

Cada página recebe wrapper `<PageDataProvider>` + 1–2 `<UserWidgetsSlot>` em pontos previsíveis (após KPIs e após gráficos). Sem mudanças em RLS nem em migrations.
