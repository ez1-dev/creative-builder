import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, FileUp, RefreshCw } from 'lucide-react';
import { seniorApi } from '@/lib/senior/api';

type Ambiente = 'HOMOLOGACAO' | 'PRODUCAO';

type LoteResumo = {
  total_detectado?: number;
  importadas?: number;
  atualizadas?: number;
  erros?: number;
  itens?: Array<{
    codreg_erp?: string | number;
    nome_regra?: string;
    modsis?: string;
    idereg?: string;
    descricao?: string;
    id_regra?: number | string | null;
    alertas?: string[];
    erro?: string;
  }>;
};

function Stat({ label, value, tone }: { label: string; value: number | undefined; tone?: 'ok' | 'warn' | 'err' | 'default' }) {
  const cls =
    tone === 'ok' ? 'bg-success/10 text-success border-success/30'
    : tone === 'warn' ? 'bg-warning/10 text-warning border-warning/30'
    : tone === 'err' ? 'bg-destructive/10 text-destructive border-destructive/30'
    : 'bg-muted text-foreground border-border';
  return (
    <Card className={cls}>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase opacity-80">{label}</div>
        <div className="text-2xl font-bold">{value ?? 0}</div>
      </CardContent>
    </Card>
  );
}

export function ImportarLoteRegrasDialog({
  onClose, onDone,
}: {
  onClose: () => void;
  onDone?: () => void;
}) {
  const [textoLote, setTextoLote] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ticket, setTicket] = useState('');
  const [ambiente, setAmbiente] = useState<Ambiente>('HOMOLOGACAO');
  const [importarPortal, setImportarPortal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<LoteResumo | null>(null);

  const disabled = !textoLote.trim() || !motivo.trim() || saving;

  const submit = async () => {
    setSaving(true);
    setErro(null);
    try {
      const r = await seniorApi.importarLoteRegras({
        texto_lote: textoLote,
        motivo: motivo.trim(),
        ambiente,
        ticket: ticket.trim() || null,
        origem_fonte: 'TEXTO_COLADO',
        importar_para_portal: importarPortal,
      });
      setResumo(r ?? {});
      toast.success('Lote processado.');
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao processar lote');
    } finally {
      setSaving(false);
    }
  };

  const fechar = () => {
    if (resumo) onDone?.();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Importar lote de regras LSP</DialogTitle>
          <DialogDescription>
            Cole o texto completo das regras (formato Senior, com "Código: ... - Descrição: ..." seguido do fonte LSP).
          </DialogDescription>
        </DialogHeader>

        {!resumo ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="md:col-span-4">
              <Label className="text-xs text-muted-foreground">Texto completo das regras *</Label>
              <Textarea
                value={textoLote}
                onChange={(e) => setTextoLote(e.target.value)}
                className="font-mono text-xs min-h-[360px]"
                placeholder={`Código: 3 - Descrição: CHA-900SDPBC01 - Sugerir depósito...\n<fonte LSP da regra>\n\nCódigo: 663 - Descrição: CTL-603LCDPR04 - Atualizar Imóvel LCDPR\n<fonte LSP da regra>`}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">Motivo *</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ticket</Label>
              <Input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ambiente</Label>
              <Select value={ambiente} onValueChange={(v) => setAmbiente(v as Ambiente)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOMOLOGACAO">HOMOLOGACAO</SelectItem>
                  <SelectItem value="PRODUCAO">PRODUCAO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <Checkbox
                id="lote-importar-portal"
                checked={importarPortal}
                onCheckedChange={(v) => setImportarPortal(v === true)}
              />
              <Label htmlFor="lote-importar-portal" className="text-sm cursor-pointer">
                Importar para portal como regra editável
              </Label>
            </div>

            {erro && (
              <div className="md:col-span-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Falha ao processar lote</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap">{erro}</AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total detectado" value={resumo.total_detectado} />
              <Stat label="Importadas" value={resumo.importadas} tone="ok" />
              <Stat label="Atualizadas" value={resumo.atualizadas} tone="warn" />
              <Stat label="Erros" value={resumo.erros} tone={resumo.erros ? 'err' : 'default'} />
            </div>

            {(resumo.itens?.length ?? 0) > 0 && (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-2 py-1.5">Código</th>
                      <th className="text-left px-2 py-1.5">Nome</th>
                      <th className="text-left px-2 py-1.5">Módulo</th>
                      <th className="text-left px-2 py-1.5">Identificador</th>
                      <th className="text-left px-2 py-1.5">Descrição</th>
                      <th className="text-left px-2 py-1.5">ID portal</th>
                      <th className="text-left px-2 py-1.5">Alertas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.itens!.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5 font-mono text-xs">{it.codreg_erp ?? '—'}</td>
                        <td className="px-2 py-1.5">{it.nome_regra ?? '—'}</td>
                        <td className="px-2 py-1.5">{it.modsis ?? '—'}</td>
                        <td className="px-2 py-1.5">{it.idereg ?? '—'}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{it.descricao ?? '—'}</td>
                        <td className="px-2 py-1.5">{it.id_regra ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          {it.erro
                            ? <Badge variant="destructive">{it.erro}</Badge>
                            : (it.alertas?.length
                                ? it.alertas.map((a, j) => (
                                    <Badge key={j} variant="outline" className="bg-warning/10 text-warning border-warning/30 mr-1">
                                      {a}
                                    </Badge>
                                  ))
                                : <span className="text-muted-foreground">—</span>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {!resumo ? (
            <>
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
              {erro && (
                <Button variant="outline" onClick={submit} disabled={disabled}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
                </Button>
              )}
              <Button onClick={submit} disabled={disabled}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando…</> : <><FileUp className="mr-2 h-4 w-4" />Processar importação</>}
              </Button>
            </>
          ) : (
            <Button onClick={fechar}>Fechar e atualizar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
