import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TipoOption { id: string; nome: string; ativo: boolean; }

interface Props {
  value: string | null | undefined;
  onChange: (v: string) => void;
  canCreate?: boolean;
  placeholder?: string;
}

export function TipoMaquinaCombobox({ value, onChange, canCreate = true, placeholder = 'Selecione ou digite...' }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TipoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('tipos_maquina').select('id,nome,ativo').eq('ativo', true).order('nome');
    if (!error) setOptions((data ?? []) as TipoOption[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const term = search.trim().toUpperCase();
  const exact = options.find((o) => o.nome === term);

  const handleCreate = async () => {
    if (!term) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from('tipos_maquina')
      .insert({ nome: term, created_by: user?.id })
      .select('id,nome,ativo').single();
    setCreating(false);
    if (error) {
      toast.error('Não foi possível criar', { description: error.message });
      return;
    }
    setOptions((prev) => [...prev, data as TipoOption].sort((a, b) => a.nome.localeCompare(b.nome)));
    onChange((data as TipoOption).nome);
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className={cn(!value && 'text-muted-foreground')}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Buscar tipo..." value={search} onValueChange={setSearch} />
          <CommandList>
            {loading && <div className="p-2 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>}
            <CommandEmpty>
              {canCreate && term ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Criar tipo "{term}"
                </button>
              ) : (
                <div className="py-3 text-center text-sm text-muted-foreground">Nenhum tipo encontrado.</div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.id} value={o.nome} onSelect={() => { onChange(o.nome); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === o.nome ? 'opacity-100' : 'opacity-0')} />
                  {o.nome}
                </CommandItem>
              ))}
              {canCreate && term && !exact && !loading && (
                <CommandItem onSelect={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Criar tipo "{term}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
