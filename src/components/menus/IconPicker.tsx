import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MENU_ICON_MAP, MENU_ICON_NAMES, resolveIcon } from '@/config/menuIcons';

type Props = {
  value?: string;
  onChange: (name: string) => void;
  className?: string;
  triggerLabel?: string;
};

export function IconPicker({ value, onChange, className, triggerLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const Current = resolveIcon(value);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return MENU_ICON_NAMES;
    return MENU_ICON_NAMES.filter((n) => n.toLowerCase().includes(query));
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-9 justify-start gap-2', className)}>
          <Current className="h-4 w-4" />
          <span className="truncate">{triggerLabel ?? value ?? 'Escolher ícone'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Input
          autoFocus
          placeholder="Buscar ícone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mb-2 h-8"
        />
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1">
            {list.map((name) => {
              const Icon = MENU_ICON_MAP[name];
              const selected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex h-10 items-center justify-center rounded border border-transparent hover:bg-accent',
                    selected && 'border-primary bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            {list.length === 0 && (
              <p className="col-span-6 py-4 text-center text-xs text-muted-foreground">Nenhum ícone.</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
