import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Permite cadastrar novo colaborador inline (admin). Default: true */
  allowCreate?: boolean;
  className?: string;
}

interface Colab {
  id: string;
  nome: string;
}

let cache: Colab[] | null = null;
const listeners = new Set<() => void>();

async function loadCatalogo(force = false): Promise<Colab[]> {
  if (cache && !force) return cache;
  const { data, error } = await supabase
    .from('colaboradores_catalogo')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  cache = (data ?? []) as Colab[];
  listeners.forEach((l) => l());
  return cache;
}

export function ColaboradorCombobox({
  value, onChange, placeholder = 'Selecione ou digite...', allowCreate = true, className,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Colab[]>(cache ?? []);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCatalogo().then(setItems).catch(() => {});
    const cb = () => setItems(cache ?? []);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 100);
    return items.filter((i) => i.nome.toLowerCase().includes(q)).slice(0, 100);
  }, [items, query]);

  const exactMatch = useMemo(
    () => items.some((i) => i.nome.toLowerCase() === query.trim().toLowerCase()),
    [items, query],
  );

  const handleCreate = async () => {
    const nome = query.trim().toUpperCase();
    if (!nome) return;
    // Se já existe (case-insensitive) na cache, apenas seleciona
    const existente = (cache ?? []).find((c) => c.nome.toUpperCase() === nome);
    if (existente) {
      onChange(existente.nome);
      setOpen(false);
      setQuery('');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('colaboradores_catalogo')
      .insert({ nome })
      .select('id, nome')
      .single();
    setCreating(false);
    if (error) {
      toast({ title: 'Não foi possível cadastrar', description: error.message, variant: 'destructive' });
      return;
    }
    cache = [...(cache ?? []), data as Colab].sort((a, b) => a.nome.localeCompare(b.nome));
    listeners.forEach((l) => l());
    onChange((data as Colab).nome);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar colaborador..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {allowCreate && query.trim() ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  disabled={creating}
                  onClick={handleCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar "{query.trim()}"
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Nenhum encontrado.</span>
              )}
            </CommandEmpty>
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.nome}
                    onSelect={() => { onChange(c.nome); setOpen(false); setQuery(''); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === c.nome ? 'opacity-100' : 'opacity-0')} />
                    {c.nome}
                  </CommandItem>
                ))}
                {allowCreate && query.trim() && !exactMatch && (
                  <CommandItem
                    value={`__create_${query}`}
                    onSelect={handleCreate}
                    disabled={creating}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar "{query.trim()}"
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
