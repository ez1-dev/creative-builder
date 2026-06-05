## Problema

O endpoint `POST /api/bi/comercial/ia-grafico` agora exige `prompt` no body e retorna 422 porque o frontend está enviando apenas o spec interpretado pela Edge Function (sem o texto original).

## Mudança

Alinhar o frontend ao novo contrato do FastAPI: enviar **prompt + filtros base** diretamente, deixando a interpretação para o backend.

### 1. `src/lib/bi/iaChartApi.ts`
- Alterar `executarGraficoIA(spec)` → `executarGraficoIA(prompt, filtrosBase)`.
- Body enviado:
  ```json
  {
    "prompt": "...",
    "anomes_ini": "...",
    "anomes_fim": "...",
    "unidade_negocio": "..."
  }
  ```
  (apenas campos presentes em `filtrosBase` são incluídos)
- Reescrever `gerarGraficoIA(prompt, filtrosBase)` para chamar diretamente `executarGraficoIA` — remover a etapa intermediária `interpretarGraficoIA` (Edge Function `bi-ia-chart`) do fluxo principal. Manter a função exportada apenas se ainda houver consumidores; caso contrário, deprecar.
- Headers já passam por `api.post` que envia `Content-Type: application/json` e `ngrok-skip-browser-warning: true`.

### 2. `src/components/bi/ai/AiChartGenerator.tsx`
- Validar antes do submit:
  - Se `prompt.trim() === ''` → `toast.error('Digite o pedido do gráfico antes de gerar.')` e abortar.
- Manter chamada `gerarGraficoIA(prompt, filtrosBase)` (assinatura inalterada).

### 3. Edge Function `bi-ia-chart`
- Não remover (pode ser usada em outros fluxos), apenas deixar de ser chamada no caminho principal.

## Critério de aceite

- `POST /api/bi/comercial/ia-grafico` não retorna mais 422.
- Body sempre contém `prompt`.
- Prompt vazio é bloqueado no frontend com a mensagem exata: *"Digite o pedido do gráfico antes de gerar."*
