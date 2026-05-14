import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported?: () => void;
}

interface ParsedRow {
  data: string | null;
  fornecedor: string | null;
  descricao: string | null;
  quantidade: number;
  maquina: string;
  tipo_maquina: string | null;
  ordem_compra: string | null;
  nota_fiscal: string | null;
  valor: number;
  centro_custo: string | null;
}

export function classifyTipoMaquina(maquina: string | null | undefined): string {
  const s = (maquina ?? '').toUpperCase();
  if (!s.trim()) return 'OUTROS';
  if (/PONTE/.test(s)) return 'PONTE ROLANTE';
  if (/(LASER|PLASMA|CORTE)/.test(s)) return 'CORTE / LASER';
  if (/(SOLDA|MIG|TIG|MAQUINA DE SOLDA)/.test(s)) return 'SOLDA';
  if (/COMPRESSOR/.test(s)) return 'COMPRESSOR';
  if (/EMPILHADEIRA/.test(s)) return 'EMPILHADEIRA';
  if (/(PINTURA|CABINE)/.test(s)) return 'PINTURA';
  if (/SERRA/.test(s)) return 'SERRA';
  if (/(GUILHOTINA|DOBRADEIRA|CALANDRA|PRENSA)/.test(s)) return 'CONFORMAÇÃO';
  if (/(FURADEIRA|TORNO|FRESA)/.test(s)) return 'USINAGEM';
  return 'OUTROS';
}

interface RowResult { linha: number; ok: boolean; erro?: string; data?: ParsedRow; }

function normKey(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ALIASES: Record<string, string[]> = {
  data: ['data', 'dia', 'datalancamento'],
  fornecedor: ['fornecedor'],
  descricao: ['descricao', 'item'],
  quantidade: ['quantidade', 'qtd', 'qtde'],
  maquina: ['maquina', 'equipamento'],
  ordem_compra: ['ordemdecompra', 'ordemcompra', 'oc'],
  nota_fiscal: ['notafiscal', 'nf'],
  valor: ['valor', 'total', 'valortotal'],
  centro_custo: ['ccusto', 'centrocusto', 'cc'],
  tipo_maquina: ['tipomaquina', 'tipodemaquina', 'tipo'],
};

function buildMap(rawKeys: string[]) {
  const map: Record<string, string> = {};
  const indexed = rawKeys.map((k) => ({ orig: k, norm: normKey(k) }));
  for (const [field, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) {
      const f = indexed.find((i) => i.norm === a);
      if (f) { map[field] = f.orig; break; }
    }
  }
  return map;
}

function normalizeDate(v: any): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function strOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function ImportarMaquinasDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<RowResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [missing, setMissing] = useState<string[]>([]);

  const reset = () => {
    setFileName(''); setRows([]); setProgress(0); setMissing([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = (o: boolean) => {
    if (!o && importing) return;
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setRows([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const sheetName = wb.SheetNames.includes('MANUTENÇÃO') ? 'MANUTENÇÃO' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, raw: true });
      const rawKeys = json.length ? Object.keys(json[0]) : [];
      const map = buildMap(rawKeys);
      const miss = ['data', 'maquina', 'valor'].filter((k) => !map[k]);
      setMissing(miss);

      const get = (raw: Record<string, any>, field: string) => {
        const k = map[field];
        return k ? raw[k] : undefined;
      };

      const results: RowResult[] = json.map((raw, idx) => {
        const linha = idx + 2;
        const allEmpty = Object.values(raw).every((v) => v === null || v === undefined || v === '');
        if (allEmpty) return { linha, ok: false, erro: '__empty__' };

        const maquinaRaw = strOrNull(get(raw, 'maquina'));
        const dataNorm = normalizeDate(get(raw, 'data'));
        const valor = normNumber(get(raw, 'valor'));
        const errs: string[] = [];
        if (!maquinaRaw) errs.push('máquina vazia');
        if (!dataNorm) errs.push('data inválida');
        if (valor === null) errs.push('valor inválido');
        if (errs.length) return { linha, ok: false, erro: errs.join('; ') };

        const tipoRaw = strOrNull(get(raw, 'tipo_maquina'));
        const data: ParsedRow = {
          data: dataNorm,
          fornecedor: strOrNull(get(raw, 'fornecedor')),
          descricao: strOrNull(get(raw, 'descricao')),
          quantidade: normNumber(get(raw, 'quantidade')) ?? 0,
          maquina: maquinaRaw!.toUpperCase(),
          tipo_maquina: tipoRaw ? tipoRaw.toUpperCase() : classifyTipoMaquina(maquinaRaw),
          ordem_compra: strOrNull(get(raw, 'ordem_compra')),
          nota_fiscal: strOrNull(get(raw, 'nota_fiscal')),
          valor: valor!,
          centro_custo: strOrNull(get(raw, 'centro_custo')),
        };
        return { linha, ok: true, data };
      }).filter((r) => r.erro !== '__empty__');

      setRows(results);
    } catch (err: any) {
      toast({ title: 'Erro ao ler planilha', description: err.message, variant: 'destructive' });
      reset();
    } finally {
      setParsing(false);
    }
  };

  const validRows = useMemo(() => rows.filter((r) => r.ok), [rows]);
  const errorRows = useMemo(() => rows.filter((r) => !r.ok), [rows]);

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    setProgress(0);
    const { data: { user } } = await supabase.auth.getUser();
    const records = validRows.map((r) => ({ ...r.data!, created_by: user?.id }));

    const BATCH = 100;
    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];
    for (let i = 0; i < records.length; i += BATCH) {
      const chunk = records.slice(i, i + BATCH);
      const { error } = await (supabase as any).from('manutencao_maquinas').insert(chunk);
      if (error) { failed += chunk.length; errors.push(error.message); }
      else inserted += chunk.length;
      setProgress(Math.round(((i + chunk.length) / records.length) * 100));
    }

    setImporting(false);
    if (failed === 0) {
      toast({ title: 'Importação concluída', description: `${inserted} registros importados.` });
    } else {
      toast({
        title: 'Importação parcial',
        description: `${inserted} importados, ${failed} falharam. ${errors[0] ?? ''}`,
        variant: 'destructive',
      });
    }
    onImported?.();
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar Manutenção de Máquinas
          </DialogTitle>
          <DialogDescription>
            Aceita planilha .xlsx com colunas: Data, Fornecedor, Descrição, Quantidade, Máquina, Ordem de Compra, Nota Fiscal, Valor, C.Custo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            ref={fileRef} type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFile} disabled={importing || parsing}
          />
          {fileName && <p className="text-xs text-muted-foreground">Arquivo: {fileName}</p>}
          {missing.length > 0 && (
            <p className="text-xs text-destructive">Colunas obrigatórias não encontradas: {missing.join(', ')}</p>
          )}
          {parsing && <p className="text-sm text-muted-foreground">Lendo planilha...</p>}

          {rows.length > 0 && !parsing && (
            <>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <strong>{validRows.length}</strong> linhas válidas
                {errorRows.length > 0 && <> · <span className="text-destructive">{errorRows.length} com erro</span></>}
              </div>

              {errorRows.length > 0 && (
                <div className="rounded-md border max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Linha</TableHead><TableHead>Erro</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {errorRows.slice(0, 30).map((r) => (
                        <TableRow key={r.linha}>
                          <TableCell>{r.linha}</TableCell>
                          <TableCell className="text-destructive text-xs">{r.erro}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {validRows.length > 0 && (
                <div className="rounded-md border max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Máquina</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.slice(0, 50).map((r) => (
                        <TableRow key={r.linha}>
                          <TableCell>{r.data!.data}</TableCell>
                          <TableCell className="font-mono text-xs">{r.data!.maquina}</TableCell>
                          <TableCell className="text-xs">{r.data!.fornecedor}</TableCell>
                          <TableCell className="text-right">{r.data!.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>{r.data!.tipo_maquina}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {importing && (
                <div className="space-y-1">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground">{progress}%</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>Cancelar</Button>
          <Button onClick={handleImport} disabled={importing || !validRows.length}>
            <Upload className="mr-1 h-4 w-4" />
            {importing ? 'Importando...' : `Importar ${validRows.length} registro(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
