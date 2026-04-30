import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { TIPO_DESPESA_OPTIONS } from '@/components/passagens/PassagensDashboard';
import { geocodeCidade, nomeNormalizado } from '@/components/passagens/cidadesBrasil';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

interface ParsedRow {
  data_registro: string | null;
  colaborador: string;
  centro_custo: string | null;
  projeto_obra: string | null;
  fornecedor: string | null;
  cia_aerea: string | null;
  numero_bilhete: string | null;
  localizador: string | null;
  origem: string | null;
  destino: string | null;
  data_ida: string | null;
  data_volta: string | null;
  motivo_viagem: string | null;
  tipo_despesa: string;
  valor: number;
  observacoes: string | null;
  uf_destino: string | null;
}

interface RowResult {
  linha: number;
  ok: boolean;
  erro?: string;
  data?: ParsedRow;
}

const HEADERS = [
  'data_registro','colaborador','centro_custo','projeto_obra','fornecedor',
  'cia_aerea','numero_bilhete','localizador','origem','destino',
  'data_ida','data_volta','motivo_viagem','tipo_despesa','valor','observacoes',
  'uf_destino',
];

// Aliases aceitos para a coluna de UF de destino
const UF_DESTINO_ALIASES = ['uf_destino', 'UF DESTINO', 'UF Destino', 'uf destino', 'UF', 'uf'];

function pickUf(raw: Record<string, any>): string | null {
  for (const k of UF_DESTINO_ALIASES) {
    const v = raw[k];
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      const s = String(v).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(s)) return s;
    }
  }
  return null;
}

function normalizeDate(v: any): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD/MM/YYYY
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // try Date()
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return null;
  // Brazilian format: 1.234,56
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function strOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function ImportarPassagensDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<RowResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  const reset = () => {
    setFileName('');
    setRows([]);
    setProgress(0);
    setProgressLabel('');
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
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames.includes('Passagens') ? 'Passagens' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, raw: true });

      const results: RowResult[] = json.map((raw, idx) => {
        const linha = idx + 2; // header at row 1
        const get = (k: string) => raw[k];
        // Skip fully empty
        const allEmpty = HEADERS.every((h) => raw[h] === null || raw[h] === undefined || raw[h] === '');
        if (allEmpty) return { linha, ok: false, erro: '__empty__' };

        const colaborador = strOrNull(get('colaborador'));
        const tipo_despesa = strOrNull(get('tipo_despesa'));
        const data_registro = normalizeDate(get('data_registro'));
        const valor = normalizeNumber(get('valor'));

        const errs: string[] = [];
        if (!colaborador) errs.push('colaborador vazio');
        if (!tipo_despesa) errs.push('tipo_despesa vazio');
        else if (!TIPO_DESPESA_OPTIONS.includes(tipo_despesa as any)) errs.push(`tipo_despesa inválido (${tipo_despesa})`);
        if (!data_registro) errs.push('data_registro inválida');
        if (valor === null || valor < 0) errs.push('valor inválido');

        if (errs.length) return { linha, ok: false, erro: errs.join('; ') };

        const data: ParsedRow = {
          data_registro,
          colaborador: colaborador!,
          centro_custo: strOrNull(get('centro_custo')),
          projeto_obra: strOrNull(get('projeto_obra')),
          fornecedor: strOrNull(get('fornecedor')),
          cia_aerea: strOrNull(get('cia_aerea')),
          numero_bilhete: strOrNull(get('numero_bilhete')),
          localizador: strOrNull(get('localizador')),
          origem: strOrNull(get('origem')),
          destino: strOrNull(get('destino')),
          data_ida: normalizeDate(get('data_ida')),
          data_volta: normalizeDate(get('data_volta')),
          motivo_viagem: strOrNull(get('motivo_viagem')),
          tipo_despesa: tipo_despesa!,
          valor: valor!,
          observacoes: strOrNull(get('observacoes')),
          uf_destino: (() => {
            const fromSheet = pickUf(raw);
            if (fromSheet) return fromSheet;
            // Fallback: deduzir pela cidade
            const dest = strOrNull(get('destino'));
            if (!dest) return null;
            return geocodeCidade(nomeNormalizado(dest))?.uf ?? null;
          })(),
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

  const validRows = rows.filter((r) => r.ok);
  const errorRows = rows.filter((r) => !r.ok);

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
      setProgressLabel(`Importando ${Math.min(i + BATCH, records.length)}/${records.length}...`);
      const { error } = await supabase.from('passagens_aereas').insert(chunk);
      if (error) {
        failed += chunk.length;
        errors.push(error.message);
      } else {
        inserted += chunk.length;
      }
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
            <FileSpreadsheet className="h-5 w-5" />
            Importar Passagens Aéreas
          </DialogTitle>
          <DialogDescription>
            Envie o arquivo .xlsx no modelo padrão. Cada linha vira um registro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="text-sm text-muted-foreground">
              Não tem o modelo? Baixe e preencha:
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/modelo-importacao-passagens-aereas.xlsx" download>
                <Download className="mr-1 h-4 w-4" /> Baixar modelo
              </a>
            </Button>
          </div>

          <div>
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFile}
              disabled={importing || parsing}
            />
            {fileName && (
              <p className="mt-1 text-xs text-muted-foreground">Arquivo: {fileName}</p>
            )}
          </div>

          {parsing && <p className="text-sm text-muted-foreground">Lendo planilha...</p>}

          {rows.length > 0 && !parsing && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md border p-2">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold">{rows.length}</div>
                </div>
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                  <div className="text-xs text-muted-foreground">Válidas</div>
                  <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{validRows.length}</div>
                </div>
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                  <div className="text-xs text-muted-foreground">Com erro</div>
                  <div className="text-lg font-semibold text-destructive">{errorRows.length}</div>
                </div>
              </div>

              {errorRows.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="mb-1 flex items-center gap-1 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Linhas que serão ignoradas
                  </div>
                  <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs">
                    {errorRows.slice(0, 30).map((r) => (
                      <li key={r.linha}>Linha {r.linha}: {r.erro}</li>
                    ))}
                    {errorRows.length > 30 && <li>... e mais {errorRows.length - 30}</li>}
                  </ul>
                </div>
              )}

              {validRows.length > 0 && (
                <div className="rounded-md border">
                  <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-medium">
                    Pré-visualização (5 primeiras)
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Origem → Destino</TableHead>
                          <TableHead>Motivo da Viagem</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validRows.slice(0, 5).map((r) => (
                          <TableRow key={r.linha}>
                            <TableCell className="text-xs">{r.data!.data_registro}</TableCell>
                            <TableCell className="text-xs">{r.data!.colaborador}</TableCell>
                            <TableCell className="text-xs">
                              {[r.data!.origem, r.data!.destino].filter(Boolean).join(' → ') || '-'}
                            </TableCell>
                            <TableCell className="text-xs">{r.data!.tipo_despesa}</TableCell>
                            <TableCell className="text-right text-xs">
                              {r.data!.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}

          {importing && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{progressLabel}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!validRows.length || importing || parsing}
          >
            <Upload className="mr-1 h-4 w-4" />
            Importar {validRows.length > 0 ? validRows.length : ''} {validRows.length === 1 ? 'registro' : 'registros'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
