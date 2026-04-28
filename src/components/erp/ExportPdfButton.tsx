import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onExport: () => Promise<void>;
  label?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

export function ExportPdfButton({ onExport, label = 'Exportar PDF', disabled, disabledTooltip, variant = 'outline' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled) {
      if (disabledTooltip) toast.info(disabledTooltip);
      return;
    }
    setLoading(true);
    const t = toast.loading('Gerando PDF...');
    try {
      await onExport();
      toast.success('PDF gerado com sucesso', { id: t });
    } catch (err: any) {
      console.error('[ExportPdfButton] erro', err);
      toast.error(err?.message || 'Falha ao gerar PDF', { id: t });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant={variant} onClick={handleClick} disabled={loading || disabled} title={disabled ? disabledTooltip : undefined}>
      {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileDown className="mr-1 h-3 w-3" />}
      {label}
    </Button>
  );
}
