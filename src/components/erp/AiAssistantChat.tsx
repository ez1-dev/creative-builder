import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { dispatchAiFilters } from '@/hooks/useAiFilters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const MODULE_LABELS: Record<string, string> = {
  estoque: 'Consulta de Estoque',
  'painel-compras': 'Painel de Compras',
  'onde-usa': 'Onde Usa',
  'compras-produto': 'Compras / Custos do Produto',
  'engenharia-producao': 'Engenharia x Produção',
};

export function AiAssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw new Error(error.message || 'Erro ao comunicar com o assistente');

      const choice = data?.choices?.[0];
      if (!choice) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Desculpe, não consegui processar sua pergunta.' },
        ]);
        return;
      }

      const msg = choice.message;
      let assistantText = msg?.content || '';

      // Handle tool calls
      if (msg?.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          if (tc.function?.name) {
            try {
              const args = JSON.parse(tc.function.arguments);
              const result = handleToolCall(tc.function.name, args);
              if (result) {
                assistantText = assistantText ? `${assistantText}\n\n${result}` : result;
              }
            } catch {
              // ignore parse error
            }
          }
        }
      }

      if (!assistantText) {
        assistantText = 'Pronto! Os filtros foram aplicados.';
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (e: any) {
      console.error('AI chat error:', e);
      toast.error(e.message || 'Erro ao comunicar com o assistente');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, handleToolCall]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          title="Assistente IA"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex w-[380px] max-h-[520px] flex-col rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Assistente IA</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[380px]" ref={scrollRef}>
            <div className="space-y-3 p-4">
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8 space-y-2">
                  <Sparkles className="mx-auto h-8 w-8 text-primary/40" />
                  <p>Olá! Pergunte sobre seus dados do ERP.</p>
                  <p className="text-[11px]">Ex: "Quais itens da família 001 têm estoque?"</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo..."
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
