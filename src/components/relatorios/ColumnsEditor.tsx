import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RelatorioColuna } from '@/lib/relatorios/types';

type ColDraft = Omit<RelatorioColuna, 'id' | 'relatorio_id'>;

interface Props {
  colunas: ColDraft[];
  onChange: (c: ColDraft[]) => void;
}

export function ColumnsEditor({ colunas, onChange }: Props) {
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

  if (colunas.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-12 border border-dashed border-border rounded-md">
        Nenhuma coluna detectada. Execute a pré-visualização para popular as colunas.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Ordem</TableHead>
            <TableHead>Campo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="w-20">Visível</TableHead>
            <TableHead className="w-28">Tipo</TableHead>
            <TableHead className="w-32">Formato</TableHead>
            <TableHead className="w-32">Alinhamento</TableHead>
            <TableHead className="w-20">Totalizar</TableHead>
            <TableHead className="w-20">Agrupar</TableHead>
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
              <TableCell>
                <Select value={c.tipo ?? 'texto'} onValueChange={(v) => update(idx, { tipo: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="numero">Número</SelectItem>
                    <SelectItem value="moeda">Moeda</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="datahora">Data/Hora</SelectItem>
                    <SelectItem value="booleano">Booleano</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><Input value={c.formato ?? ''} onChange={(e) => update(idx, { formato: e.target.value })} className="h-8" placeholder="ex: 0,00" /></TableCell>
              <TableCell>
                <Select value={c.alinhamento} onValueChange={(v) => update(idx, { alinhamento: v as any })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esquerda">Esquerda</SelectItem>
                    <SelectItem value="centro">Centro</SelectItem>
                    <SelectItem value="direita">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><Switch checked={c.totalizar} onCheckedChange={(v) => update(idx, { totalizar: v })} /></TableCell>
              <TableCell><Switch checked={c.agrupar} onCheckedChange={(v) => update(idx, { agrupar: v })} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
