import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import {
  fetchDeParaMonitorErp, upsertDeParaMonitorErp,
  type DeParaTelaErp, type DeParaTelaPendente,
} from '@/lib/monitorErpNativoDeparaApi';
import { formatNumberBR } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

type DraftPend = { nome_tela: string; atalho: string; modulo: string; obs: string; saving?: boolean };
type DraftMap = { nome_tela: string; atalho: string; modulo: string; ativo: boolean; obs: string; saving?: boolean };

function fmtDia(v?: string | null) {
  if (!v) return '-';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
}

export function DeParaMonitorErpModal({ open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [nao, setNao] = useState<DeParaTelaPendente[]>([]);
  const [map, setMap] = useState<DeParaTelaErp[]>([]);
  const [dPend, setDPend] = useState<Record<string, DraftPend>>({});
  const [dMap, setDMap] = useState<Record<string, DraftMap>>({});
  const [savedAny, setSavedAny] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetchDeParaMonitorErp();
      const sortedNao = [...r.nao_mapeadas].sort((a, b) => (b.gravacoes ?? 0) - (a.gravacoes ?? 0));
      setNao(sortedNao);
      setMap(r.mapeadas);
      setDPend(Object.fromEntries(sortedNao.map((n) => [n.tela, { nome_tela: '', atalho: '', modulo: '', obs: '' }])));
      setDMap(Object.fromEntries(r.mapeadas.map((m) => [m.tela, {
        nome_tela: m.nome_tela ?? '', atalho: m.atalho ?? '', modulo: m.modulo ?? '',
        ativo: !!m.ativo, obs: m.obs ?? '',
      }])));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) { setSavedAny(false); load(); }
  }, [open, load]);

  const handleClose = (v: boolean) => {
    if (!v && savedAny) onSaved?.();
    onOpenChange(v);
  };

  const errorMsg = useMemo(() => {
    if (!error) return null;
    if (error?.statusCode === 401) return 'Sessão expirada. Faça login novamente.';
    return 'Não foi possível carregar o de-para de telas.';
  }, [error]);

  const salvarPend = async (tela: string) => {
    const d = dPend[tela];
    if (!d || !d.nome_tela.trim() || !d.modulo.trim()) return;
    setDPend((p) => ({ ...p, [tela]: { ...d, saving: true } }));
    try {
      await upsertDeParaMonitorErp({
        tela, nome_tela: d.nome_tela.trim(), atalho: d.atalho.trim(),
        modulo: d.modulo.trim(), ativo: true, obs: d.obs.trim() || undefined,
      });
      toast.success(`Tela ${tela} mapeada.`);
      setSavedAny(true);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar mapeamento.');
      setDPend((p) => ({ ...p, [tela]: { ...d, saving: false } }));
    }
  };

  const salvarMap = async (tela: string) => {
    const d = dMap[tela];
    if (!d || !d.nome_tela.trim() || !d.modulo.trim()) return;
    setDMap((p) => ({ ...p, [tela]: { ...d, saving: true } }));
    try {
      await upsertDeParaMonitorErp({
        tela, nome_tela: d.nome_tela.trim(), atalho: d.atalho.trim(),
        modulo: d.modulo.trim(), ativo: d.ativo, obs: d.obs.trim() || undefined,
      });
      toast.success(`Tela ${tela} atualizada.`);
      setSavedAny(true);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar mapeamento.');
      setDMap((p) => ({ ...p, [tela]: { ...d, saving: false } }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>De-Para de Telas — ERP Nativo</DialogTitle>
          <DialogDescription>
            Mapeie as telas auditadas no ERP Senior para nome amigável, atalho de acesso e módulo.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="a-mapear">
            <TabsList>
              <TabsTrigger value="a-mapear">A mapear ({nao.length})</TabsTrigger>
              <TabsTrigger value="mapeadas">Mapeadas ({map.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="a-mapear" className="mt-3">
              <div className="max-h-[55vh] overflow-auto">
                {nao.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Não há novas telas para mapear.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tela</TableHead>
                        <TableHead className="text-right">Gravações</TableHead>
                        <TableHead>Última mov.</TableHead>
                        <TableHead>Nome amigável *</TableHead>
                        <TableHead>Atalho</TableHead>
                        <TableHead>Módulo *</TableHead>
                        <TableHead>Obs</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nao.map((row, idx) => {
                        const d = dPend[row.tela] ?? { nome_tela: '', atalho: '', modulo: '', obs: '' };
                        const destaque = idx < 3 && (row.gravacoes ?? 0) > 0;
                        const canSave = !!d.nome_tela.trim() && !!d.modulo.trim() && !d.saving;
                        return (
                          <TableRow key={row.tela} className={destaque ? 'bg-orange-500/5' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{row.tela}</span>
                                <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15">Pendente</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatNumberBR(row.gravacoes)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fmtDia(row.ultimo_dia)}</TableCell>
                            <TableCell>
                              <Input className="h-8" value={d.nome_tela}
                                onChange={(e) => setDPend((p) => ({ ...p, [row.tela]: { ...d, nome_tela: e.target.value } }))}
                                placeholder="Ex.: Nota Fiscal de Entrada" />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 font-mono" value={d.atalho}
                                onChange={(e) => setDPend((p) => ({ ...p, [row.tela]: { ...d, atalho: e.target.value } }))}
                                placeholder="Ex.: F075NFE" />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={d.modulo}
                                onChange={(e) => setDPend((p) => ({ ...p, [row.tela]: { ...d, modulo: e.target.value } }))}
                                placeholder="Ex.: Compras" />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={d.obs}
                                onChange={(e) => setDPend((p) => ({ ...p, [row.tela]: { ...d, obs: e.target.value } }))} />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" disabled={!canSave} onClick={() => salvarPend(row.tela)} className="gap-1">
                                {d.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Salvar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="mapeadas" className="mt-3">
              <div className="max-h-[55vh] overflow-auto">
                {map.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum de-para cadastrado ainda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tela</TableHead>
                        <TableHead>Nome amigável</TableHead>
                        <TableHead>Atalho</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {map.map((row) => {
                        const d = dMap[row.tela] ?? {
                          nome_tela: row.nome_tela ?? '', atalho: row.atalho ?? '',
                          modulo: row.modulo ?? '', ativo: !!row.ativo, obs: row.obs ?? '',
                        };
                        const canSave = !!d.nome_tela.trim() && !!d.modulo.trim() && !d.saving;
                        return (
                          <TableRow key={row.tela}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{row.tela}</span>
                                {d.ativo ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">Mapeada</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={d.nome_tela}
                                onChange={(e) => setDMap((p) => ({ ...p, [row.tela]: { ...d, nome_tela: e.target.value } }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 font-mono" value={d.atalho}
                                onChange={(e) => setDMap((p) => ({ ...p, [row.tela]: { ...d, atalho: e.target.value } }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={d.modulo}
                                onChange={(e) => setDMap((p) => ({ ...p, [row.tela]: { ...d, modulo: e.target.value } }))} />
                            </TableCell>
                            <TableCell>
                              <Switch checked={d.ativo}
                                onCheckedChange={(v) => setDMap((p) => ({ ...p, [row.tela]: { ...d, ativo: v } }))} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8" value={d.obs}
                                onChange={(e) => setDMap((p) => ({ ...p, [row.tela]: { ...d, obs: e.target.value } }))} />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" disabled={!canSave} onClick={() => salvarMap(row.tela)} className="gap-1">
                                {d.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Salvar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
