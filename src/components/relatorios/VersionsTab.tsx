import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { listVersoes, criarVersao, restaurarVersao, deletarVersao } from '@/lib/relatorios/api';
import type { RelatorioVersao } from '@/lib/relatorios/types';

interface Props {
  relatorioId: string | undefined;
  onRestored?: () => void;
}

export function VersionsTab({ relatorioId, onRestored }: Props) {
  const [versoes, setVersoes] = useState<RelatorioVersao[]>([]);
  const [loading, setLoading] = useState(false);
  const [obs, setObs] = useState('');
  const [creating, setCreating] = useState(false);
  const [toRestore, setToRestore] = useState<RelatorioVersao | null>(null);
  const [toDelete, setToDelete] = useState<RelatorioVersao | null>(null);

  async function reload() {
    if (!relatorioId) return;
    setLoading(true);
    try {
      const data = await listVersoes(relatorioId);
      setVersoes(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [relatorioId]);

  async function handleCreate() {
    if (!relatorioId) return;
    setCreating(true);
    try {
      await criarVersao(relatorioId, obs || undefined);
      toast.success('Snapshot de versão criado');
      setObs('');
      reload();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(v: RelatorioVersao) {
    try {
      await restaurarVersao(v.id);
      toast.success(`Versão ${v.versao} restaurada`);
      onRestored?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(v: RelatorioVersao) {
    try {
      await deletarVersao(v.id);
      toast.success(`Versão ${v.versao} excluída`);
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!relatorioId) {
    return <div className="text-sm text-muted-foreground py-8">Salve o relatório antes de gerar versões.</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Nova versão (snapshot)</h3>
        <p className="text-xs text-muted-foreground">
          Salva uma cópia completa do estado atual (SQL, parâmetros, colunas e layout).
        </p>
        <div className="flex items-center gap-2">
          <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" className="h-9" />
          <Button onClick={handleCreate} disabled={creating} size="sm">
            {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Criar versão
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Histórico de versões</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="rounded-md border border-border overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-20">Versão</TableHead>
                  <TableHead className="w-40">Data</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-48 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versoes.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Nenhuma versão registrada.</TableCell></TableRow>
                )}
                {versoes.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">v{v.versao}</TableCell>
                    <TableCell className="text-xs">{format(new Date(v.criado_em), 'dd/MM/yy HH:mm')}</TableCell>
                    <TableCell className="text-xs">{v.observacao ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setToRestore(v)} className="mr-1">
                        <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(v)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <AlertDialog open={!!toRestore} onOpenChange={(o) => !o && setToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão v{toRestore?.versao}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação substituirá o SQL, parâmetros, colunas e layout atuais pelo conteúdo desta versão.
              Recomenda-se criar uma nova versão antes de restaurar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toRestore) handleRestore(toRestore); setToRestore(null); }}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir versão v{toDelete?.versao}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (toDelete) handleDelete(toDelete); setToDelete(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
