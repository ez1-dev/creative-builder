import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, X, Send, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { dispatchAiFilters } from '@/hooks/useAiFilters';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAiPageContextValue } from '@/contexts/AiPageContext';
import { useUserSuggestions, type SearchSuggestion } from '@/hooks/useUserSuggestions';
import { SearchSuggestions } from '@/components/erp/SearchSuggestions';

type Msg = { role: 'user' | 'assistant'; content: string };

const MODULE_LABELS: Record<string, string> = {
  estoque: 'Consulta de Estoque',
  'painel-compras': 'Painel de Compras',
  'onde-usa': 'Onde Usa',
  'compras-produto': 'Compras / Custos do Produto',
  'engenharia-producao': 'Engenharia x Produção',
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export function AiAssistantChat() {
  const { canUseAi } = useUserPermissions();
  const { context: pageContext } = useAiPageContextValue();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Derive current module key from route or pageContext
  const currentModule = useMemo(() => {
    if (pageContext?.module) return pageContext.module;
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return seg && MODULE_LABELS[seg] ? seg : seg || null;
  }, [location.pathname, pageContext?.module]);

  const { suggestions } = useUserSuggestions(currentModule, 3);

  // Ctrl+J / Cmd+J global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleToolCall = useCallback(
    (name: string, args: any) => {
      if (name === 'apply_erp_filters') {
        const { module, filters, explanation } = args;
        const label = MODULE_LABELS[module] || module;
        toast.info(`Aplicando filtros em ${label}...`);
        navigate(`/${module}`);
        setTimeout(() => dispatchAiFilters(module, filters), 300);
        return explanation || `Navegando para ${label} com os filtros aplicados.`;
      }
      return null;
    },
    [navigate]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Msg = { role: 'user', content: text.trim() };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setInput('');
      setIsLoading(true);

      // Insert empty assistant placeholder for streaming
      let assistantSoFar = '';
      const toolCallsAccum: Record<number, { name?: string; args: string }> = {};

      const upsertAssistant = (next: string) => {
        assistantSoFar = next;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      try {
        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            pageContext,
          }),
        });

        if (resp.status === 429) {
          toast.error('Limite de requisições excedido. Aguarde alguns segundos.');
          throw new Error('rate_limited');
        }
        if (resp.status === 402) {
          toast.error('Créditos de IA esgotados. Adicione créditos no workspace.');
          throw new Error('no_credits');
        }
        if (!resp.ok || !resp.body) throw new Error('Falha ao iniciar stream');

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              streamDone = true;
              break;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) upsertAssistant(assistantSoFar + delta.content);
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallsAccum[idx]) toolCallsAccum[idx] = { args: '' };
                  if (tc.function?.name) toolCallsAccum[idx].name = tc.function.name;
                  if (tc.function?.arguments) toolCallsAccum[idx].args += tc.function.arguments;
                }
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }

        // Process accumulated tool calls
        const toolCalls = Object.values(toolCallsAccum).filter((t) => t.name);
        if (toolCalls.length) {
          for (const tc of toolCalls) {
            try {
              const args = JSON.parse(tc.args);
              const result = handleToolCall(tc.name!, args);
              if (result) {
                upsertAssistant(
                  assistantSoFar ? `${assistantSoFar}\n\n${result}` : result
                );
              }
            } catch {
              // ignore
            }
          }
          if (!assistantSoFar) upsertAssistant('Pronto! Os filtros foram aplicados.');
        } else if (!assistantSoFar) {
          upsertAssistant('Desculpe, não consegui processar sua pergunta.');
        }
      } catch (e: any) {
        if (e.message !== 'rate_limited' && e.message !== 'no_credits') {
          console.error('AI chat error:', e);
          toast.error('Erro ao comunicar com o assistente');
        }
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            return prev.slice(0, -1).concat({
              role: 'assistant',
              content: 'Desculpe, ocorreu um erro. Tente novamente.',
            });
          }
          if (last?.role === 'user') {
            return [
              ...prev,
              { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' },
            ];
          }
          return prev;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, messages, isLoading, handleToolCall, pageContext]
  );

  const handleExplainPage = useCallback(() => {
    if (!pageContext) {
      toast.info('Esta tela ainda não fornece contexto detalhado para o assistente.');
      return;
    }
    sendMessage(
      `Explique resumidamente o que é a tela "${pageContext.title}", seus principais filtros e como interpretar os indicadores visíveis. Seja objetivo (até 6 linhas).`
    );
  }, [pageContext, sendMessage]);

  const handlePickSuggestion = useCallback(
    (s: SearchSuggestion) => {
      if (!currentModule) return;
      const label = MODULE_LABELS[currentModule] || currentModule;
      toast.info(`Aplicando filtros sugeridos em ${label}...`);
      // Ensure we are on the module page; useAiFilters listener triggers search
      if (location.pathname !== `/${currentModule}`) {
        navigate(`/${currentModule}`);
      }
      setTimeout(() => dispatchAiFilters(currentModule, s.filters), 250);
      setOpen(false);
    },
    [currentModule, location.pathname, navigate]
  );

  if (!canUseAi) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          title="Assistente IA (Ctrl+J)"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex w-[380px] max-h-[560px] flex-col rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">Assistente IA</span>
                {pageContext?.title && (
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Contexto: {pageContext.title}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {pageContext && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleExplainPage}
                  disabled={isLoading}
                  title="Explique esta página"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)} title="Fechar (Ctrl+J)">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[420px]" ref={scrollRef}>
            <div className="space-y-3 p-4">
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8 space-y-2">
                  <Sparkles className="mx-auto h-8 w-8 text-primary/40" />
                  <p>Olá! Pergunte sobre seus dados do ERP.</p>
                  <p className="text-[11px]">Ex: "Quais itens da família 001 têm estoque?"</p>
                  <p className="text-[10px] text-muted-foreground/70">Atalho: <kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">J</kbd></p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm break-words',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1 [&_table]:my-1 [&_table]:text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || '…'}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo... (Ctrl+J)"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
