

## Assistente IA com abertura automática, sugestões proativas e posicionamento inteligente

### Objetivo
Tornar o assistente **proativo**: ele se abre sozinho em momentos certos com sugestões úteis, e se posiciona automaticamente no canto da tela que **não cobre os dados** que o usuário está olhando (KPIs, tabelas, filtros).

### Como vai funcionar

#### 1) Abertura automática inteligente (com regras de não-incômodo)

O assistente abre sozinho quando:
- **Primeira visita do dia em uma tela**: 1 vez por dia por rota (controlado em `localStorage`).
- **Tela com filtros vazios há mais de 8 segundos** + usuário inativo (sem digitar/clicar): sugere "Quer que eu aplique os filtros que você usa nesta tela?".
- **Padrão detectado pelo histórico** (`useUserSuggestions`): se o usuário tem 3+ buscas frequentes salvas para a rota, abre uma vez sugerindo aplicar.
- **Após erro de carregamento ou tela vazia** (0 resultados): sugere ajuda contextual ("Sem dados para esses filtros. Quer ver os top 10 do mês?").

Regras de **não incômodo** (críticas):
- **Cooldown global**: nunca reabre sozinho em menos de 30 min após o usuário fechar.
- **Limite diário**: máximo 3 aberturas automáticas por dia, em telas distintas.
- **Respeitar fechamento explícito**: se o usuário fecha com X, "snooze" daquela rota por 24h.
- **Toggle de preferência** em `Configurações → Minhas Preferências`: "Permitir sugestões automáticas do Assistente IA" (default: ligado). Persistido em `user_preferences`.
- Nunca abre durante digitação em input/textarea ou enquanto modal/drawer está aberto.
- Nunca abre se `canUseAi === false`.

#### 2) Modo proativo: sugestões na abertura
Quando abre sozinho, o painel exibe um **banner pré-preenchido** acima do input:

```
✨ Olá! Notei que você costuma consultar:
  [ Família 001 + Situação Ativo ]   [ Saldo > 0 ]   [ Top 10 estoque ]
  
  Ou pergunte: "qual produto tem mais estoque hoje?"
```

Cada chip aplica os filtros (`apply_erp_filters`) ou dispara `query_erp_data` direto. Reaproveita `SearchSuggestions` + adiciona 1–2 perguntas analíticas sugeridas conforme o módulo (ex.: estoque → "qual produto tem mais saldo?", contas-pagar → "qual o maior título em aberto?").

#### 3) Posicionamento adaptativo (anti-oclusão)

Hoje o painel é fixo no canto **inferior-direito**. Vai virar **flutuante e arrastável**, com **auto-posicionamento inteligente**:

**Algoritmo de posição automática** (executa ao abrir e quando a viewport ou o conteúdo principal muda):
1. Mede o `<main>` e identifica regiões "sensíveis" via seletores conhecidos: `[data-ai-avoid]`, `.kpi-card`, `table`, `[role="grid"]`, `.recharts-wrapper`.
2. Divide a tela em 4 quadrantes (TL, TR, BL, BR) e calcula a área coberta de regiões sensíveis em cada um.
3. Escolhe o quadrante **com menor cobertura sensível** que tenha espaço suficiente (mín. 380×520 px).
4. Se nenhum quadrante for "limpo" (tela cheia de dados), posiciona em **modo lateral compacto** (largura 320, altura full, ancorado à direita) com botão "minimizar para bolha".
5. Em viewports < 768px (mobile): vira **bottom sheet** (drawer inferior) — sempre.

**Controles do usuário**:
- Botão **"📌 Fixar posição"** salva o quadrante escolhido para a rota (`user_preferences.ai_panel_position[rota]`).
- Cabeçalho do painel é **arrastável** (drag handle); ao soltar, salva a posição manual.
- Botão **"⤢ Minimizar"** colapsa para bolha flutuante (mantém o canto escolhido).
- Resize handle no canto oposto à âncora, dimensões persistidas.

**Z-index e transparência**:
- Painel com `box-shadow` forte e `backdrop-blur`, mas opaco (sem confundir leitura).
- Quando o mouse fica fora por 4s + tela tem scroll ativo, painel reduz opacidade para 85% (volta a 100% no hover).

#### 4) Marcação de áreas sensíveis (mínima nas páginas)
Para o algoritmo funcionar bem sem listar seletor por seletor, adicionamos atributo `data-ai-avoid` em 3 wrappers genéricos em **`PageHeader`, `KPICard` e `DataTable`** (uma única alteração nos 3 componentes base já cobre todas as 20 telas).

### Arquivos alterados / criados

**Criados:**
- `src/hooks/useAiAutoOpen.ts` — regras de quando abrir sozinho (cooldown, snooze, limite diário, preferência).
- `src/hooks/useAiPanelPlacement.ts` — algoritmo de quadrantes + persistência da posição/tamanho por rota.
- `src/components/erp/AiProactiveBanner.tsx` — banner com chips de sugestões iniciais (recente + analíticas).

**Editados:**
- `src/components/erp/AiAssistantChat.tsx`
  - Substituir posição fixa por wrapper `<DraggableResizable>` controlado por `useAiPanelPlacement`.
  - Integrar `useAiAutoOpen` para abrir sozinho conforme regras.
  - Renderizar `AiProactiveBanner` no topo quando aberto sem mensagens ainda.
  - Adicionar botões: minimizar, fixar posição, fechar (com snooze 24h).
- `src/components/erp/PageHeader.tsx`, `src/components/erp/KPICard.tsx`, `src/components/erp/DataTable.tsx`
  - Adicionar `data-ai-avoid` no wrapper raiz.
- `src/components/erp/MinhasPreferenciasSection.tsx`
  - Toggle "Permitir sugestões automáticas do Assistente IA".
  - Botão "Resetar posição/tamanho do Assistente".
- `supabase/migrations/*` (nova migration)
  - Adicionar coluna `ai_assistant_prefs jsonb default '{}'::jsonb` em `user_preferences` (armazena: `auto_open_enabled`, `panel_position_by_route`, `panel_size`, `snoozed_routes`, `last_auto_open_dates`).

### Estados persistidos

| Chave | Local | Conteúdo |
|---|---|---|
| `ai:last_close_at` | localStorage | timestamp do último fechamento (cooldown 30min) |
| `ai:auto_opens_today` | localStorage | `{ date, count, routes[] }` |
| `ai:snoozed_until[rota]` | localStorage | timestamp para liberar abertura naquela rota |
| `user_preferences.ai_assistant_prefs` | Supabase | toggle, posição/tamanho por rota, posição fixada |

### Casos de teste manuais
1. Login → abrir `/estoque` pela 1ª vez no dia → assistente abre sozinho com 3 chips de sugestão.
2. Fechar com X → navegar para `/contas-pagar` em 5 min → não abre sozinho (cooldown).
3. Esperar 31 min → abrir nova rota → abre se ainda não atingiu limite de 3/dia.
4. Desligar toggle em Preferências → nunca mais abre sozinho (só no clique no botão flutuante).
5. Tela cheia de KPIs + tabela: painel posiciona no quadrante com menor cobertura; se todos cheios, vira lateral direita.
6. Arrastar painel para outro canto → recarregar página → painel volta na posição salva para a rota.
7. Mobile (< 768px) → vira bottom sheet, sem drag.
8. `canUseAi === false` → nenhuma abertura automática.
9. Tela com 0 resultados após filtro → assistente abre sugerindo "ver top 10 do mês".

### Fora de escopo
- IA "interromper" durante digitação em formulários (nunca faz isso).
- Notificações push fora do app.
- Sugestões cross-tela ("vai para compras agora") sem comando do usuário.
- Animação de mascote/avatar — mantém ícone Bot atual.

### Resultado
- Assistente **vira parceiro proativo**: aparece quando ajuda, some quando atrapalha.
- **Nunca cobre KPIs/tabelas** sem o usuário pedir — escolhe sozinho o canto livre.
- Usuário tem **controle total**: pode desligar, fixar posição, arrastar, redimensionar.
- Limites rígidos garantem que **não vire incômodo** (cooldown, snooze, limite diário, respeito ao fechamento).

