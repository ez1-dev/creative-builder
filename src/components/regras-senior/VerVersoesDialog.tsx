import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { seniorApi } from '@/lib/senior/api';
import type { RegraVersao } from '@/lib/senior/types';
import { StatusRegraBadge } from './StatusRegraBadge';

export function VerVersoesDialog({ regraId, onClose }: { regraId: number | string; onClose: () => void }) {
  const [rows, setRows] = useState<RegraVersao[] | null>(null);
  useEffect(() => {
    seniorApi.listarVersoes(regraId).then(setRows);
  }, [regraId]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Versões da regra</DialogTitle></DialogHeader>
        {rows === null ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma versão registrada.</div>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((v) => (
              <li key={String(v.id)} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">v{v.versao}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(v.criado_em).toLocaleString('pt-BR')}
                    {v.criado_por ? ` · ${v.criado_por}` : ''}
                  </div>
                  {v.motivo && <div className="mt-1 text-xs">{v.motivo}</div>}
                </div>
                <StatusRegraBadge value={v.status_regra} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
