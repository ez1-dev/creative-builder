

# Assistente IA com Chat em Linguagem Natural para o ERP

## Visão Geral

Criar um chat flutuante acessível de qualquer página que permite ao usuário fazer perguntas como "quais produtos da família 001 têm estoque?" e a IA traduz isso em filtros, navega para a página correta e executa a consulta automaticamente.

## Arquitetura

```text
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Chat Widget │────▶│ Edge Function    │────▶│ Lovable AI   │
│  (flutuante) │◀────│ /ai-assistant    │◀────│ Gateway      │
└─────────────┘     └──────────────────┘     └──────────────┘
       │
       ▼
  Aplica filtros na página correta e executa busca
```

## Implementação

### 1. Edge Function `supabase/functions/ai-assistant/index.ts`

- Recebe a mensagem do usuário + contexto dos módulos disponíveis
- Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool calling
- Define uma tool `apply_erp_filters` com schema estruturado:
  - `module`: qual página navegar (estoque, painel-compras, onde-usa, etc.)
  - `filters`: objeto com os filtros específicos do módulo (codpro, despro, codfam, fornecedor, etc.)
  - `explanation`: texto explicando o que está fazendo
- Retorna a resposta da IA (texto + ação estruturada quando aplicável)
- Trata erros 429/402 com mensagens claras

### 2. Componente `src/components/erp/AiAssistantChat.tsx`

- Botão flutuante no canto inferior direito (ícone de chat com IA)
- Ao clicar, abre um painel de chat com:
  - Histórico de mensagens (user/assistant) com markdown rendering via `react-markdown`
  - Input de texto na parte inferior
  - Streaming de resposta token a token
- Quando a IA retorna uma ação `apply_erp_filters`:
  - Navega para a rota do módulo indicado (`useNavigate`)
  - Dispara um evento customizado `erp:apply-filters` com os filtros
  - Mostra ao usuário: "Aplicando filtros em Consulta de Estoque..."

### 3. Hook `src/hooks/useAiFilters.ts`

- Escuta o evento `erp:apply-filters` via `window.addEventListener`
- Cada página (Estoque, Painel Compras, etc.) usa este hook
- Quando recebe filtros, atualiza o state de filtros e dispara a busca automaticamente

### 4. Integração nas páginas existentes

- Adicionar `useAiFilters` em cada página que suporta filtros (EstoquePage, PainelComprasPage, OndeUsaPage, ComprasProdutoPage, etc.)
- O hook recebe o setter de filtros e a função de busca como parâmetros

### 5. Componente no layout — `src/components/AppLayout.tsx`

- Adicionar `<AiAssistantChat />` dentro do layout para estar disponível em todas as páginas

## Módulos suportados e seus filtros

O system prompt da IA incluirá o mapeamento:

| Módulo | Rota | Filtros disponíveis |
|--------|------|-------------------|
| Estoque | /estoque | codpro, despro, codfam, codori, coddep, somente_com_estoque |
| Onde Usa | /onde-usa | codpro, despro |
| Painel Compras | /painel-compras | codigo_item, descricao_item, fornecedor, numero_oc, situacao, tipo, familia, origem, data_inicio, data_fim |
| Compras/Custos | /compras-produto | codpro, despro |
| Eng. x Produção | /engenharia-producao | projeto, descricao |

## Exemplos de interação

- **Usuário**: "Quais itens da família 001 têm estoque?"
  → IA navega para /estoque, aplica codfam=001, somente_com_estoque=true, executa busca

- **Usuário**: "Mostre as OCs atrasadas do fornecedor ABC"
  → IA navega para /painel-compras, aplica fornecedor=ABC, somente_atrasados=true, executa busca

- **Usuário**: "Qual o saldo do produto 12345?"
  → IA navega para /estoque, aplica codpro=12345, executa busca

## Arquivos a criar/editar

1. **Criar** `supabase/functions/ai-assistant/index.ts` — edge function com tool calling
2. **Criar** `src/components/erp/AiAssistantChat.tsx` — widget de chat flutuante com streaming
3. **Criar** `src/hooks/useAiFilters.ts` — hook para receber filtros da IA
4. **Editar** `src/components/AppLayout.tsx` — adicionar o chat widget
5. **Editar** páginas de consulta (EstoquePage, PainelComprasPage, OndeUsaPage, ComprasProdutoPage, EngenhariaProducaoPage) — integrar useAiFilters
6. **Instalar** `react-markdown` para renderizar respostas da IA

## Detalhes técnicos

- Modelo: `google/gemini-3-flash-preview` (rápido, sem custo de API key)
- Autenticação: LOVABLE_API_KEY já disponível nos secrets
- Streaming SSE para resposta em tempo real
- Tool calling para extrair filtros estruturados da resposta
- Evento customizado do DOM para comunicação cross-componente sem prop drilling

