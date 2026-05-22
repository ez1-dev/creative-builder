import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, RotateCcw, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ColunaAlinhamento, ColunaTipo, RelatorioColuna } from '@/lib/relatorios/types';
import { useState } from 'react';
import { toast } from 'sonner';

type ColDraft = Omit<RelatorioColuna, 'id' | 'relatorio_id'>;

interface Props {
  colunas: ColDraft[];
  onChange: (c: ColDraft[]) => void;
  onSave?: () => Promise<void> | void;
  onRestoreDefault?: () => Promise<void> | void;
  canSave?: boolean;
}

export function ColumnsEditor({ colunas, onChange, onSave, onRestoreDefault, canSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  function update(idx: number, patch: Partial<ColDraft>) {
    onChange(colunas.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function move(idx: number, dir: -1 | 1) {
    const t = idx + dir;
    if (t < 0 || t >= colunas.length) return;
    const next = [...colunas];
    [next[idx], next[t]] = [next[t], next[idx]];
    onChange(next.map((c, i) => ({ ...c, ordem: i })));
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave();
      toast.success('Configuração de colunas salva');
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    if (!onRestoreDefault) return;
    setRestoring(true);
    try {
      await onRestoreDefault();
      toast.success('Colunas restauradas a partir do preview');
    } catch (e: any) {
      toast.error(`Erro ao restaurar: ${e.message ?? e}`);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          {colunas.length} coluna(s) configurada(s).
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRestore} disabled={restoring || !onRestoreDefault}>
            {restoring ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
            Restaurar padrão
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !onSave || !canSave}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar configuração de colunas
          </Button>
        </div>
      </div>

      {colunas.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-md">
          Nenhuma coluna detectada. Execute a pré-visualização para popular as colunas.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-auto max-h-[560px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-20">Ordem</TableHead>
                <TableHead className="w-36">Campo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-16">Tela</TableHead>
                <TableHead className="w-16">Excel</TableHead>
                <TableHead className="w-16">PDF</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-28">Formato</TableHead>
                <TableHead className="w-28">Alinhamento</TableHead>
                <TableHead className="w-20">Largura</TableHead>
                <TableHead className="w-16">Σ</TableHead>
                <TableHead className="w-16">Agrup.</TableHead>
                <TableHead className="w-16">Ord.</TableHead>
                <TableHead className="w-16">Filtro</TableHead>
              </TableRow>

            </TableHeader>
            <TableBody>
              {colunas.map((c, idx) => (
                <TableRow key={c.campo + idx}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, -1)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, 1)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.campo}</TableCell>
                  <TableCell><Input value={c.titulo ?? ''} onChange={(e) => update(idx, { titulo: e.target.value })} className="h-8" /></TableCell>
                  <TableCell><Switch checked={c.visivel} onCheckedChange={(v) => update(idx, { visivel: v })} /></TableCell>
                  <TableCell><Switch checked={c.visivel_excel} onCheckedChange={(v) => update(idx, { visivel_excel: v })} /></TableCell>
                  <TableCell><Switch checked={c.visivel_pdf} onCheckedChange={(v) => update(idx, { visivel_pdf: v })} /></TableCell>
                  <TableCell>
                    <Select value={(c.tipo ?? 'texto') as string} onValueChange={(v) => update(idx, { tipo: v as ColunaTipo })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto">Texto</SelectItem>
                        <SelectItem value="numero">Número</SelectItem>
                        <SelectItem value="moeda">Moeda</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="data_hora">Data/Hora</SelectItem>
                        <SelectItem value="percentual">Percentual</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={c.formato ?? ''} onChange={(e) => update(idx, { formato: e.target.value || null })} className="h-8" placeholder="ex.: dd/MM/yyyy" /></TableCell>
                  <TableCell>
                    <Select value={c.alinhamento} onValueChange={(v) => update(idx, { alinhamento: v as ColunaAlinhamento })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="esquerda">Esquerda</SelectItem>
                        <SelectItem value="centro">Centro</SelectItem>
                        <SelectItem value="direita">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={c.largura ?? ''}
                      onChange={(e) => update(idx, { largura: e.target.value === '' ? null : Number(e.target.value) })}
                      className="h-8"
                      placeholder="px"
                    />
                  </TableCell>
                  <TableCell><Switch checked={c.totalizar} onCheckedChange={(v) => update(idx, { totalizar: v })} /></TableCell>
                  <TableCell><Switch checked={c.agrupar} onCheckedChange={(v) => update(idx, { agrupar: v })} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
