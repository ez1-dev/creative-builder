## Diagnóstico

Procurei por `gerarTituloComIA`, `generateTitle`, `Failed to generate title` em `src/` e `supabase/functions/` e **não existe** nenhuma função de geração automática de título no projeto hoje. Nem a `/bi/faturamento-validacao`, nem o ETL, nem a edge `ai-assistant` chamam IA para gerar título.

A mensagem "Failed to generate title" muito provavelmente vem de uma camada externa (chat/assistente do Lovable ou rótulo de aba), mas o pedido do usuário é claro: **o erro não pode bloquear a tela nem o ETL**. Vou então (1) blindar a tela contra qualquer erro de query/IA, (2) criar um helper genérico de título com fallback, e (3) deixar pronto o ponto de uso caso alguma chamada futura de IA para título seja adicionada.

## Mudanças

### 1. `src/lib/safeTitle.ts` (novo)
Helper único e reutilizável:
```ts
export async function safeTitle(
  fn: () => Promise<string | null | undefined>,
  fallback: string,
): Promise<string> {
  try {
    const t = await fn();
    return (t && t.trim()) || fallback;
  } catch (err) {
    console.warn('[safeTitle] falha ao gerar título, usando fallback:', err);
    return fallback;
  }
}
```
Sem dependência de chave/endpoint. Se no futuro alguém adicionar `gerarTituloComIA`, basta envolver com `safeTitle(() => gerarTituloComIA(payload), 'Validação BI Faturamento')`.

### 2. `src/pages/bi/FaturamentoValidacaoPage.tsx`
- Garantir que **nenhum erro de query derrube a tela**: cada `useQuery` já tem `isError` tratado, mas vou:
  - Adicionar `retry: 1` e `refetchOnWindowFocus: false` nos 4 `useQuery`.
  - Envolver `atualizar()` e `exportarCSV()` em try/catch com `toast` (sem throw).
  - Garantir que o `PageHeader` use título estático `"Validação BI Faturamento"` — nunca depende de IA.
- Sem mudança nos endpoints nem na lógica de unwrap.

### 3. `src/pages/EtlTarefaDetalhePage.tsx` e `src/components/etl/ExecutarModal.tsx`
- Auditar e confirmar que o título exibido (header da execução / modal) é **literal**, não vem de IA. Se houver alguma chamada implícita, trocar por string fixa (`"Execução ETL"` / `nome_tarefa`).
- Garantir que falha em `executarTarefa`/`executarAcao` só dispare `toast.error` e não propague exception não tratada (já está com try/catch — apenas validar).

### 4. `supabase/functions/ai-assistant/index.ts`
- Verificar se há algum ponto que gere "title" para conversa. Se sim, envolver em try/catch retornando string vazia em vez de 500.

### 5. Documentação
- Adicionar nota curta em `docs/backend-bi-faturamento-validacao.md`: "Esta tela não usa IA para nada — título é estático. Falhas em /api/bi/faturamento/* mostram ErrorState localizado e não derrubam o resto da página."

## Fora de escopo
- Não criar endpoint novo de geração de título.
- Não tocar em `src/integrations/supabase/{client,types}.ts` nem `.env`.
- Não mexer no contrato dos 4 endpoints `/api/bi/faturamento/*`.

## Verificação
- Abrir `/bi/faturamento-validacao` com backend ok → carrega normal.
- Simular erro (filtro inválido) → cada card/tabela mostra "Não foi possível carregar", restante da tela continua funcional, botão Atualizar funciona.
- Executar tarefa ETL com erro → toast de erro, modal não trava.
