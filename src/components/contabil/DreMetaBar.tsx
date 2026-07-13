import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Clock, Database, FileText, Wifi, WifiOff } from 'lucide-react';
import type { DreMatrizMeta } from '@/lib/contabil/dreMatrizApi';

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export interface DreMetaBarProps {
  meta: DreMatrizMeta | null;
  apiOnline: boolean | null; // null = desconhecido
  loading?: boolean;
}

export function DreMetaBar({ meta, apiOnline, loading }: DreMetaBarProps) {
  const fonte = meta?.fonte_saldo ?? '—';
  const modelo = meta?.modelo_nome ?? meta?.modelo_id ?? '—';
  const periodo = meta?.periodo ?? '—';
  const status = (meta?.status ?? '').toLowerCase();

  const statusVariant =
    status === 'atualizado' ? 'default'
    : status === 'desatualizado' ? 'secondary'
    : status === 'nao_materializado' ? 'destructive'
    : 'outline';

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <MetaItem icon={<Database className="h-3.5 w-3.5" />} label="Fonte">
            <Badge variant="outline" className="font-mono">{fonte}</Badge>
            {meta?.fonte_temporaria && (
              <Badge variant="secondary" className="ml-1 text-[10px]">temporária</Badge>
            )}
          </MetaItem>
          <MetaItem icon={<FileText className="h-3.5 w-3.5" />} label="Modelo DRE">
            <span className="font-medium">{modelo}</span>
          </MetaItem>
          <MetaItem icon={<Clock className="h-3.5 w-3.5" />} label="Período">
            <span>{periodo}</span>
          </MetaItem>
          <MetaItem icon={<Clock className="h-3.5 w-3.5" />} label="Última sincronização">
            <span>{fmtDateTime(meta?.ultima_sincronizacao)}</span>
          </MetaItem>
          <MetaItem icon={<Clock className="h-3.5 w-3.5" />} label="Último cálculo">
            <span>{fmtDateTime(meta?.ultima_materializacao)}</span>
          </MetaItem>
          <MetaItem
            icon={apiOnline === false ? <WifiOff className="h-3.5 w-3.5 text-destructive" /> : <Wifi className="h-3.5 w-3.5" />}
            label="API"
          >
            <Badge variant={apiOnline === false ? 'destructive' : apiOnline ? 'default' : 'outline'} className="text-[10px]">
              {loading ? 'verificando…' : apiOnline === false ? 'offline' : apiOnline ? 'online' : '—'}
            </Badge>
          </MetaItem>
          <MetaItem
            icon={status === 'atualizado'
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
            label="Status"
          >
            <Badge variant={statusVariant} className="text-[10px]">
              {meta?.status ?? '—'}
            </Badge>
            {meta?.status_fechamento && (
              <span className="ml-1 text-muted-foreground">· fechamento: {meta.status_fechamento}</span>
            )}
          </MetaItem>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center gap-1.5')}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}
