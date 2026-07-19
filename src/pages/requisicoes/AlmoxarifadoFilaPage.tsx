import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useFilaAlmox, useIniciarSeparacao, useReservarItem, useSepararItem, useAtenderItem, useTransferirItem, useBaixarOpItem, useRegistrarFaltaItem, useEnviarComprasItem, useEstornarItem, useSidWriteEnabled } from '@/hooks/requisicoes';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, HandMetal, Lock } from 'lucide-react';
import { AcaoItemDialog, type AcaoItem } from '@/components/requisicoes/AcaoItemDialog';
import { IntegracaoOfflineBanner } from '@/components/requisicoes/IntegracaoOfflineBanner';
import type { FilaAlmoxItem } from '@/types/requisicoes';

export default function AlmoxarifadoFilaPage() {
  const [busca, setBusca] = useState('');
  const [somenteFalta, setSomenteFalta] = useState(false);

  const fila = useFilaAlmox();
  const iniciar = useIniciarSeparacao();
  const reservar = useReservarItem();
  const separar = useSepararItem();
  const atender = useAtenderItem();
  const transferir = useTransferirItem();
  const baixar = useBaixarOpItem();
  const falta = useRegistrarFaltaItem();
  const compras = useEnviarComprasItem();
  const estornar = useEstornarItem();

  const [dialog, setDialog] = useState<{ acao: AcaoItem; item: FilaAlmoxItem } | null>(null);

  const items = useMemo(() => {
    const raw = fila.data ?? [];
    return raw.filter((f) => {
      if (somenteFalta && (f.saldo_disponivel == null || f.saldo_disponivel >= f.qtd_pendente)) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return [f.requisicao_numero, f.codcmp, f.descricao, f.op, f.centro_custo]
          .filter(Boolean)
          .some((x) => String(x).toLowerCase().includes(q));
      }
      return true;
    });
  }, [fila.data, somenteFalta, busca]);

  const acaoHandler = async (acao: AcaoItem, item: FilaAlmoxItem, payload: Record<string, any>) => {
    const args = { id: item.requisicao_id, seq: item.item_seq, payload };
    switch (acao) {
      case 'reservar':   return reservar.mutateAsync(args);
      case 'separar':    return separar.mutateAsync(args);
      case 'atender':    return atender.mutateAsync(args);
      case 'transferir': return transferir.mutateAsync(args);
      case 'baixar':     return baixar.mutateAsync(args);
      case 'falta':      return falta.mutateAsync(args);
      case 'compras':    return compras.mutateAsync(args);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Fila do almoxarifado" description="Assumir, reservar, separar, atender total/parcial, transferir, baixar OP, registrar falta ou enviar para compras." />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div>
            <Label>Buscar</Label>
            <Input placeholder="Nº, componente, OP, CC…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant={somenteFalta ? 'default' : 'outline'} size="sm" onClick={() => setSomenteFalta((v) => !v)}>
              Só com falta de saldo
            </Button>
            <Button variant="outline" size="sm" onClick={() => fila.refetch()}>Atualizar</Button>
          </div>
        </CardContent>
      </Card>

      {fila.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Não foi possível carregar a fila do almoxarifado.
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Req.</TableHead>
              <TableHead>Comp. (CODCMP)</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>OP</TableHead>
              <TableHead className="text-right">Solic.</TableHead>
              <TableHead className="text-right">Aprov.</TableHead>
              <TableHead className="text-right">Sep.</TableHead>
              <TableHead className="text-right">Atend.</TableHead>
              <TableHead className="text-right">Pend.</TableHead>
              <TableHead className="text-right">Saldo disp.</TableHead>
              <TableHead>Dep. O→D</TableHead>
              <TableHead>Prio.</TableHead>
              <TableHead>Separando</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fila.isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 14 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-12" /></TableCell>
              ))}</TableRow>
            ))}
            {!fila.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum item na fila.
                </TableCell>
              </TableRow>
            )}
            {items.map((f) => {
              const semSaldo = f.saldo_disponivel != null && f.saldo_disponivel < f.qtd_pendente;
              return (
                <TableRow key={`${f.requisicao_id}-${f.item_seq}`} className={semSaldo ? 'bg-orange-50/40' : ''}>
                  <TableCell className="whitespace-nowrap">{f.requisicao_numero}<span className="ml-1 text-xs text-muted-foreground">·{f.item_seq}</span></TableCell>
                  <TableCell className="font-mono text-xs">{f.codcmp}</TableCell>
                  <TableCell className="max-w-[16rem] truncate">{f.descricao ?? '—'}</TableCell>
                  <TableCell>{f.op ?? '—'}</TableCell>
                  <TableCell className="text-right">{f.qtd_solicitada}</TableCell>
                  <TableCell className="text-right">{f.qtd_aprovada}</TableCell>
                  <TableCell className="text-right">{f.qtd_separada}</TableCell>
                  <TableCell className="text-right">{f.qtd_atendida}</TableCell>
                  <TableCell className="text-right font-medium">{f.qtd_pendente}</TableCell>
                  <TableCell className="text-right">{f.saldo_disponivel ?? '—'}</TableCell>
                  <TableCell className="text-xs">{f.deposito_origem ?? '—'} → {f.deposito_destino ?? '—'}</TableCell>
                  <TableCell>{f.prioridade}</TableCell>
                  <TableCell>
                    {f.separacao_por ? (
                      <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-800">
                        <Lock className="h-3 w-3" /> {f.separacao_por}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">livre</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!f.separacao_por && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => iniciar.mutate({ id: f.requisicao_id, seq: f.item_seq })}
                          disabled={iniciar.isPending}
                        >
                          <HandMetal className="mr-1 h-3.5 w-3.5" /> Assumir
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Movimentar</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setDialog({ acao: 'reservar', item: f })}>Reservar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ acao: 'separar', item: f })}>Separar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ acao: 'atender', item: f })}>Atender (total/parcial)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ acao: 'transferir', item: f })}>Transferir depósito</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ acao: 'baixar', item: f })}>Baixar componente na OP</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDialog({ acao: 'falta', item: f })}>Registrar falta</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDialog({ acao: 'compras', item: f })}>Enviar para compras</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-700"
                            onClick={() => estornar.mutate({ id: f.requisicao_id, seq: f.item_seq })}
                          >
                            Estornar item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AcaoItemDialog
        open={!!dialog}
        onOpenChange={(v) => !v && setDialog(null)}
        acao={dialog?.acao ?? 'atender'}
        item={dialog?.item ?? null}
        onConfirm={async (payload) => {
          if (dialog) await acaoHandler(dialog.acao, dialog.item, payload);
        }}
      />
    </div>
  );
}
