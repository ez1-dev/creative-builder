

## Melhorias para o Assistente IA em todas as páginas

### Diagnóstico atual
Revisei `src/components/erp/AiAssistantChat.tsx`, `supabase/functions/ai-assistant/index.ts` e `src/hooks/useAiFilters.ts`. O assistente hoje:
- É um botão flutuante global no `AppLayout` (aparece em todas as rotas autenticadas, ok).
- Faz tool-calling para aplicar filtros no contexto da rota atual via `useAiFilters`.
- Usa Lovable AI Gateway (Gemini) com histórico curto.
- Renderiza respostas em texto plano (sem markdown).
- Não tem memória entre sessões / não persiste conversas.
- Não conhece o conteúdo dinâmico da tela (KPIs, totais, registros visíveis).
- Sem indicador de "digitando", sem streaming.
- Acesso controlado por `ai_enabled` (ok).

### Melhorias propostas (priorizadas)

**1. Contextualização por página (alto impacto)**
- Cada página registra um "contexto" no assistente (rota, KPIs visíveis, filtros ativos, totais agregados, top N linhas).
- Assistente recebe esse contexto no `system prompt` → respostas tipo *"Qual fornecedor concentra mais valor a pagar este mês?"* funcionam em qualquer tela.
- Implementação: hook `useAiPageContext({ title, kpis, filters, summary })` + Provider que armazena o contexto atual; edge function injeta no prompt.

**2. Streaming de respostas (UX)**
- Migrar `ai-assistant` para SSE (já documentado em useful-context).
- Texto aparece token-a-token; reduz percepção de latência.

**3. Renderização markdown + tabelas**
- Adicionar `react-markdown` + `remark-gfm` no balão do assistente.
- Permite tabelas, listas, código, links → resposta sobre KPIs vira tabela legível.

**4. Histórico persistente por usuário**
- Tabela `ai_conversations` + `ai_messages` (RLS por `user_id`).
- Sidebar do chat lista conversas anteriores; "Nova conversa" cria thread.
- Permite continuar de onde parou ao trocar de rota.

**5. Ações rápidas contextuais (chips)**
- Acima do input, 3-5 sugestões dinâmicas geradas a partir da rota atual:
  - Em `/contas-pagar`: "Top 10 fornecedores vencidos", "Resumo por mês".
  - Em `/estoque-min-max`: "Itens críticos", "Sugerir compras urgentes".
- Implementação: tabela `ai_quick_actions(route, label, prompt)` ou mapa estático no front.

**6. Mais ferramentas (tool calling) globais**
- `navigate_to(route)` — abrir outra tela.
- `export_current_view()` — disparar o `ExportButton` da página atual.
- `explain_kpi(kpi_id)` — explicar o cálculo do KPI clicado.
- `summarize_table()` — gerar resumo executivo da tabela visível.

**7. Voice input (opcional)**
- Botão de microfone usando Web Speech API → transcreve fala para texto no input.
- Útil para uso em chão de fábrica/tablet.

**8. Atalho de teclado global**
- `Ctrl+J` (ou `Cmd+J`) abre/fecha o chat de qualquer página.
- Ícone do botão flutuante mostra a dica em tooltip.

**9. Indicadores visuais**
- "Digitando..." com 3 pontos animados durante a resposta.
- Badge de "novo" quando o assistente termina enquanto o chat está fechado.
- Contador de mensagens não lidas no botão flutuante.

**10. Feedback por mensagem (👍/👎)**
- Botões discretos em cada resposta do assistente.
- Salva em `ai_message_feedback(message_id, rating, user_id)` para futuras melhorias de prompt.

**11. Limites e custos visíveis**
- Mostrar erros 402 (sem créditos) e 429 (rate limit) com toast claro + link para a tela de Configurações/Workspace.
- Já parcialmente tratado, mas precisa UX consistente.

**12. Modo "explicar esta tela"**
- Botão único "Explique esta página" → IA descreve o que a tela faz, principais filtros e como interpretar os KPIs.
- Ótimo para onboarding de novos usuários.

### Escopo sugerido para a primeira entrega
Para evitar inflar uma rodada só, proponho começar pelo **pacote 1** (impacto rápido):

1. Contextualização por página (`useAiPageContext`)
2. Renderização markdown
3. Streaming SSE
4. Indicador "digitando"
5. Atalho `Ctrl+J`
6. Modo "Explique esta página"

E deixar para um pacote 2 (futuro):
- Histórico persistente
- Feedback 👍/👎
- Voice input
- Quick actions dinâmicas
- Tools `navigate_to` / `export_current_view`

### Arquivos que serão alterados/criados (pacote 1)
- `src/components/erp/AiAssistantChat.tsx` — markdown, streaming, indicador, atalho, "explique esta página".
- `src/contexts/AiPageContextProvider.tsx` *(novo)* — armazena contexto da rota atual.
- `src/hooks/useAiPageContext.ts` *(novo)* — registra contexto a partir de cada página.
- `src/App.tsx` — envolver com `AiPageContextProvider`.
- `supabase/functions/ai-assistant/index.ts` — aceitar `pageContext` no body, retornar SSE.
- Páginas principais (`EstoquePage`, `ContasPagarPage`, etc.) — chamar `useAiPageContext({ title, kpis, filters, summary })`.
- `package.json` — adicionar `react-markdown` + `remark-gfm`.

### Perguntas antes de implementar

