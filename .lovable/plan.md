

## Seletor de intervalo do auto-refresh

### Escopo
Permitir ao usuário escolher o intervalo do auto-refresh na tela `/auditoria-apontamento-genius` entre **30s**, **1 min** (padrão) e **2 min**.

### Mudanças

**Arquivo único:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. **Novo state**
   - `intervaloRefresh: 30 | 60 | 120` (segundos), default `60`.

2. **UI** (ao lado do switch "Auto-atualizar", no `PageHeader`)
   - Substituir o label fixo "Auto-atualizar (1 min)" por "Auto-atualizar".
   - Adicionar `Select` (shadcn `@/components/ui/select`) compacto com opções:
     - `30s`
     - `1 min`
     - `2 min`
   - O `Select` fica desabilitado quando `autoRefresh` está desligado (visualmente esmaecido), mas continua editável; mudar o valor com o switch ligado reinicia o intervalo imediatamente.
   - Ordem visual: `[Switch] Auto-atualizar  [Select 1 min ▾]  · Atualizado há 23s`.

3. **Lógica do intervalo**
   - O `useEffect` que cria o `setInterval` passa a depender de `[autoRefresh, intervaloRefresh]` e usa `intervaloRefresh * 1000` como período. Ao mudar o seletor com auto-refresh ligado, o efeito limpa o interval anterior e cria um novo (comportamento natural do React).
   - O `visibilitychange` handler usa `intervaloRefresh` como limite de "idade" para disparar consulta imediata ao retomar foco (em vez de fixo 60s).

4. **Sem persistência** entre sessões (mantém escopo enxuto, igual ao switch).

### Fora de escopo
- Persistir preferência.
- Intervalos customizados (ex: digitar valor).
- Aplicar a outras telas.

### Resultado
Usuário escolhe a frequência do auto-refresh (30s / 1 min / 2 min) sem mexer em código, com troca instantânea quando o auto-refresh está ativo.

