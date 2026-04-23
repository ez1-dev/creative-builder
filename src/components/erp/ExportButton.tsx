import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { api, getApiUrl } from '@/lib/api';
import { toast } from 'sonner';

interface ExportButtonProps {
  endpoint: string;
  params?: Record<string, any>;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary';
}

export function ExportButton({ endpoint, params, label = 'Exportar Excel', variant = 'outline' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      const appendValue = (key: string, value: any) => {
        if (value === null || value === undefined || value === '') return;
        if (typeof value === 'boolean') {
          if (value) searchParams.append(key, 'true');
          return;
        }
        if (value instanceof Date) {
          if (!isNaN(value.getTime())) {
            searchParams.append(key, value.toISOString().slice(0, 10));
          }
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((item) => appendValue(key, item));
          return;
        }
        if (typeof value === 'object') {
          // skip nested objects — backend won't validate them anyway
          return;
        }
        searchParams.append(key, String(value));
      };
      if (params) {
        Object.entries(params).forEach(([key, value]) => appendValue(key, value));
      }
      const queryString = searchParams.toString();
      const url = `${getApiUrl()}${endpoint}${queryString ? `?${queryString}` : ''}`;

      const headers: Record<string, string> = {
        'ngrok-skip-browser-warning': 'true',
      };
      const token = api.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });

      if (response.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'export.xlsx';
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant={variant} onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
      {label}
    </Button>
  );
}
