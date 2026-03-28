import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';

interface ExportButtonProps {
  endpoint: string;
  params?: Record<string, any>;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

export function ExportButton({ endpoint, params, label = 'Exportar Excel', variant = 'outline' }: ExportButtonProps) {
  const handleExport = () => {
    const url = api.getExportUrl(endpoint, params);
    window.open(url, '_blank');
  };

  return (
    <Button size="sm" variant={variant} onClick={handleExport}>
      <Download className="mr-1 h-3 w-3" />
      {label}
    </Button>
  );
}
