/**
 * Botão padronizado para aplicar um componente da Biblioteca BI a uma página.
 * Pode ser colocado em qualquer card do catálogo passando o `componentId`.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { ApplyComponentDialog } from './ApplyComponentDialog';

export function ApplyComponentButton({
  componentId, label = 'Aplicar em página…', size = 'sm', variant = 'outline',
}: {
  componentId: string;
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'ghost' | 'secondary' | 'default';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size as any}
        variant={variant as any}
        onClick={() => setOpen(true)}
        className="h-7 gap-1.5 text-[11px]"
      >
        <Sparkles className="h-3 w-3" />
        {label}
      </Button>
      <ApplyComponentDialog open={open} onOpenChange={setOpen} componentId={componentId} />
    </>
  );
}
