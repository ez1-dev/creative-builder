

# Corrigir "Failed to fetch" no Assistente IA

## Causa raiz

O Preview do Lovable tem um proxy de fetch que intercepta requisições POST e pode quebrá-las, especialmente com streaming SSE. Isso é um problema conhecido da plataforma de preview.

A URL atual usa `VITE_SUPABASE_URL` diretamente:
```
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
```

## Solução

Trocar o `fetch()` direto pelo `supabase.functions.invoke()` do SDK, que lida corretamente com o proxy do Preview. Como o SDK não suporta streaming nativamente com `invoke()`, vamos usar `invoke()` sem streaming (removendo `stream: true` da edge function quando chamada sem streaming header) **ou** manter streaming mas construir a URL usando `VITE_SUPABASE_PROJECT_ID` em vez de `VITE_SUPABASE_URL`.

A abordagem mais robusta: usar `supabase.functions.invoke()` sem streaming e processar a resposta completa de uma vez.

## Mudanças

### 1. `supabase/functions/ai-assistant/index.ts`
- Detectar se o cliente quer streaming via header `Accept: text/event-stream`
- Se não, retornar a resposta JSON completa (sem `stream: true` no body para o AI Gateway)
- Manter streaming como opção para uso futuro

### 2. `src/components/erp/AiAssistantChat.tsx`
- Substituir `fetch()` por `supabase.functions.invoke('ai-assistant', { body: ... })`
- Processar a resposta JSON completa em vez de streaming SSE
- Importar o cliente Supabase de `@/integrations/supabase/client`
- A resposta virá com o texto completo e possíveis tool calls de uma vez

## Arquivos afetados
- `supabase/functions/ai-assistant/index.ts`
- `src/components/erp/AiAssistantChat.tsx`

