

## Auto-refresh opcional na Auditoria Apontamento Genius

### Escopo
Adicionar controle opcional de atualização automática (a cada 1 minuto) na tela `/auditoria-apontamento-genius`, mantendo a consulta sob demanda como padrão.

### Comportamento
- Switch **"Auto-atualizar (1 min)"** no painel de filtros, ao lado do botão Consultar/Limpar. Desligado por padrão.
- Quando ligado:
  - Dispara `consultar()` imediatamente (se ainda não houver dados) e a cada 60s.
  - Pausa automaticamente quando a aba do navegador fica oculta (`document.visibilityState === 'hidden'`) e retoma ao voltar a ficar visível, evitando consultas em background desnecessárias.
  - Pausa enquanto uma consulta ainda estiver em andamento (`loading`), para não empilhar requisições.
- Indicador textual discreto ao lado do switch: **"Atualizado há Xs"** (timestamp da última consulta bem-sucedida, recalculado a cada 5s via tick local).
- Ao desligar o switch, o intervalo é limpo imediatamente.
- Mudar filtros não desliga o auto-refresh — a próxima tick usa os filtros atuais.

### Implementação técnica

**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. Novos states:
   - `autoRefresh: boolean` (default `false`).
   - `ultimaAtualizacao: Date | null` setado no fim de `consultar()` em caso de sucesso.
   - `, agora: Date` atualizado por um `setInterval` de 5s só para recomputar o "há Xs" (não dispara fetch).

2. `useEffect` que cria/limpa um `setInterval(60_000)` baseado em `autoRefresh`. Dentro do tick:
   - Se `document.hidden` → return.
   - Se `loadingRef.current` → return.
   - Caso contrário, chama `consultar()`.
   - Usar `useRef` para `loading` e para a função `consultar` (assinada com filtros atuais via closure estável) evitando recriar o intervalo a cada digitação de filtro.

3. `useEffect` separado escutando `visibilitychange`: ao voltar a ficar visível com `autoRefresh` ligado e idade da última atualização > 60s, dispara `consultar()` na hora.

4. UI:
   - Importar `Switch` de `@/components/ui/switch`.
   - No `PageHeader`/barra de ações da página, inserir bloco:
     ```
     [Switch] Auto-atualizar (1 min)   · Atualizado há 23s
     ```
     Quando `ultimaAtualizacao` for `null`, ocultar o texto "Atualizado há…".

5. Helper `formatarHaQuanto(date, agora)` → "agora", "há 12s", "há 2 min".

### Fora de escopo
- Persistir preferência do switch entre sessões.
- Realtime/WebSocket.
- Mudar intervalo configurável (fixo em 60s).
- Auto-refresh em outras telas.

### Resultado
O usuário pode ligar o auto-refresh para acompanhar apontamentos novos sem clicar Consultar, com pausa automática quando a aba não está visível e indicação clara de quando foi a última atualização.

