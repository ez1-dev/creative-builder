import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, X, Send, Sparkles, HelpCircle, Pin, PinOff, Minimize2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { dispatchAiFilters } from '@/hooks/useAiFilters';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAiPageContextValue } from '@/contexts/AiPageContext';
import { useUserSuggestions, type SearchSuggestion } from '@/hooks/useUserSuggestions';
import { SearchSuggestions } from '@/components/erp/SearchSuggestions';
import { executeQueryErpData } from '@/lib/aiQueryExecutor';
import { useAiAssistantPrefs } from '@/hooks/useAiAssistantPrefs';
import { useAiAutoOpen, recordAiClose } from '@/hooks/useAiAutoOpen';
import { useAiPanelPlacement } from '@/hooks/useAiPanelPlacement';
import { AiProactiveBanner } from '@/components/erp/AiProactiveBanner';

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
  const { canUseAi, canView, hasPermissions } = useUserPermissions();
  const { context: pageContext } = useAiPageContextValue();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { prefs } = useAiAssistantPrefs();
  const placement = useAiPanelPlacement(open && !minimized);

  // Derive current module key from route or pageContext
  const currentModule = useMemo(() => {
    if (pageContext?.module) return pageContext.module;
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return seg && MODULE_LABELS[seg] ? seg : seg || null;
  }, [location.pathname, pageContext?.module]);

  const { suggestions } = useUserSuggestions(currentModule, 3);

  // Auto-open: triggered when on a route with suggestions and respecting non-annoyance rules
  useAiAutoOpen({
    enabled: prefs.auto_open_enabled,
    canUseAi,
    isOpen: open,
    hasSuggestions: suggestions.length > 0,
    onAutoOpen: useCallback(() => {
      setOpen(true);
      setMinimized(false);
    }, []),
  });

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
        const { module, filters: rawFilters, explanation } = args;
        const filters = { ...(rawFilters || {}) };
        const label = MODULE_LABELS[module] || module;

        // Hardening: drill-down em contas-pagar/receber não pode usar APENAS numero_titulo
        // (busca por substring no backend → traz dezenas de títulos não relacionados).
        if (module === 'contas-pagar' || module === 'contas-receber') {
          const keys = Object.keys(filters);
          const hasFence = ['valor_min', 'valor_max', 'data_vencimento_ini', 'data_vencimento_fim']
            .some((k) => filters[k] !== undefined && filters[k] !== null && filters[k] !== '');
          const onlyNumero = keys.length > 0 && keys.every((k) => k === 'numero_titulo' || k === 'somente_em_aberto');

          if (filters.numero_titulo && !hasFence && onlyNumero) {
            toast.warning('Filtro amplo aplicado — pode trazer títulos similares (substring).');
          }

          // Heurística: se a conversa recente menciona "em aberto", força o filtro
          const recentText = messages.slice(-6).map((m) => m.content).join(' ').toLowerCase();
          if (/em\s+aberto|saldo\s+aberto/.test(recentText) && filters.somente_em_aberto === undefined) {
            filters.somente_em_aberto = true;
          }
        }

        toast.info(`Aplicando filtros em ${label}...`);
        navigate(`/${module}`);
        setTimeout(() => dispatchAiFilters(module, filters), 300);
        return explanation || `Navegando para ${label} com os filtros aplicados.`;
      }
      return null;
    },
    [navigate, messages]
  );

  const streamFromBody = useCallback(
    async (
      body: any,
      assistantSoFarRef: { value: string },
      upsertAssistant: (next: string) => void,
      toolCallsAccum: Record<number, { id?: string; name?: string; args: string }>
    ) => {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
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
            if (delta?.content) {
              assistantSoFarRef.value += delta.content;
              upsertAssistant(assistantSoFarRef.value);
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsAccum[idx]) toolCallsAccum[idx] = { args: '' };
                if (tc.id) toolCallsAccum[idx].id = tc.id;
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
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Msg = { role: 'user', content: text.trim() };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setInput('');
      setIsLoading(true);

      const assistantSoFarRef = { value: '' };
      const upsertAssistant = (next: string) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: next } : m
            );
          }
          return [...prev, { role: 'assistant', content: next }];
        });
      };

      try {
        const toolCallsAccum: Record<number, { id?: string; name?: string; args: string }> = {};
        await streamFromBody(
          {
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            pageContext,
          },
          assistantSoFarRef,
          upsertAssistant,
          toolCallsAccum
        );

        const toolCalls = Object.values(toolCallsAccum).filter((t) => t.name);
        if (toolCalls.length === 0) {
          if (!assistantSoFarRef.value) {
            upsertAssistant('Desculpe, não consegui processar sua pergunta.');
          }
          return;
        }

        // Separate client-side tools (query_erp_data) from navigation tools (apply_erp_filters)
        const clientToolResults: Array<{ tool_call_id: string; name: string; result: any }> = [];
        const navigationCalls: Array<{ name: string; args: any }> = [];

        for (const tc of toolCalls) {
          let args: any = {};
          try {
            args = JSON.parse(tc.args);
          } catch {
            args = {};
          }
          if (tc.name === 'query_erp_data') {
            const tempMsg = `🔎 Consultando ERP (${args.module || '...'})...`;
            upsertAssistant(assistantSoFarRef.value ? `${assistantSoFarRef.value}\n\n${tempMsg}` : tempMsg);
            const result = await executeQueryErpData(args, canView, hasPermissions);
            clientToolResults.push({
              tool_call_id: tc.id || `call_${Math.random().toString(36).slice(2)}`,
              name: tc.name,
              result,
            });
          } else if (tc.name === 'apply_erp_filters') {
            navigationCalls.push({ name: tc.name, args });
          }
        }

        // If we have client tool results, send them back to the AI for final formatting
        if (clientToolResults.length > 0) {
          // Reset assistant content (will be replaced by streamed final response)
          assistantSoFarRef.value = '';
          upsertAssistant('');

          const priorAssistant = {
            content: '',
            tool_calls: toolCalls
              .filter((t) => t.name === 'query_erp_data')
              .map((t) => ({
                id: t.id,
                type: 'function',
                function: { name: t.name, arguments: t.args },
              })),
          };

          const followupAccum: Record<number, { id?: string; name?: string; args: string }> = {};
          await streamFromBody(
            {
              messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
              pageContext,
              priorAssistant,
              toolResults: clientToolResults,
            },
            assistantSoFarRef,
            upsertAssistant,
            followupAccum
          );

          if (!assistantSoFarRef.value) {
            upsertAssistant('Não consegui formatar a resposta. Tente reformular.');
          }
        }

        // Execute navigation tool calls (after rendering analytical answer)
        for (const nav of navigationCalls) {
          const result = handleToolCall(nav.name, nav.args);
          if (result) {
            assistantSoFarRef.value = assistantSoFarRef.value
              ? `${assistantSoFarRef.value}\n\n${result}`
              : result;
            upsertAssistant(assistantSoFarRef.value);
          }
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
    [input, messages, isLoading, handleToolCall, pageContext, streamFromBody, canView, hasPermissions]
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

  const handleClose = useCallback(() => {
    recordAiClose(location.pathname, true);
    setOpen(false);
    setMinimized(false);
  }, [location.pathname]);

  // Drag handler for desktop panel header
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (placement.isMobile || !placement.position) return;
      // Avoid dragging when clicking buttons
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: placement.position.x,
        origY: placement.position.y,
      };
      e.preventDefault();
    },
    [placement.isMobile, placement.position]
  );

  useEffect(() => {
    if (placement.isMobile) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      placement.updatePosition({
        x: d.origX + (e.clientX - d.startX),
        y: d.origY + (e.clientY - d.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [placement]);

  if (!canUseAi) return null;

  const moduleLabel = currentModule ? MODULE_LABELS[currentModule] : undefined;

  const headerContent = (
    <>
      <div
        onMouseDown={onHeaderMouseDown}
        className={cn(
          'flex items-center justify-between border-b px-4 py-3',
          !placement.isMobile && 'cursor-move select-none'
        )}
      >
        <div className="flex items-center gap-2">
          {!placement.isMobile && <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/60" />}
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
          {!placement.isMobile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={placement.togglePinned}
                title={placement.pinned ? 'Desafixar posição' : 'Fixar posição nesta tela'}
              >
                {placement.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setMinimized(true)}
                title="Minimizar"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClose}
            title="Fechar (Ctrl+J)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="space-y-3 p-4">
          {messages.length === 0 && (
            <>
              <div className="text-center text-xs text-muted-foreground py-2 space-y-1">
                <Sparkles className="mx-auto h-7 w-7 text-primary/40" />
                <p>Pergunte sobre seus dados do ERP.</p>
                <p className="text-[10px] text-muted-foreground/70">
                  Atalho: <kbd className="rounded border px-1">Ctrl</kbd> +{' '}
                  <kbd className="rounded border px-1">J</kbd>
                </p>
              </div>
              <AiProactiveBanner
                moduleKey={currentModule}
                moduleLabel={moduleLabel}
                filterSuggestions={suggestions}
                onPickFilter={handlePickSuggestion}
                onPickPrompt={(p) => sendMessage(p)}
              />
              {suggestions.length === 0 && (
                <SearchSuggestions suggestions={suggestions} onPick={handlePickSuggestion} />
              )}
            </>
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
    </>
  );

  return (
    <>
      {(!open || minimized) && (
        <button
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          title="Assistente IA (Ctrl+J)"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {/* Mobile: bottom sheet */}
      {open && !minimized && placement.isMobile && (
        <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
          <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
            {headerContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop: floating draggable panel */}
      {open && !minimized && !placement.isMobile && placement.position && (
        <div
          className="fixed z-50 flex flex-col rounded-xl border bg-card shadow-2xl backdrop-blur-sm"
          style={{
            left: placement.position.x,
            top: placement.position.y,
            width: placement.position.w,
            height: placement.position.h,
          }}
        >
          {headerContent}
        </div>
      )}
    </>
  );
}

