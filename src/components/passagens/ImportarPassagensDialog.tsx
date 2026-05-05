import { useMemo, useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CalendarRange } from 'lucide-react';
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

// Normaliza chaves de cabeçalho: lowercase, sem acento, sem pontuação/espaço
function normKey(s: string): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Mapeia chaves normalizadas para campo canônico
const FIELD_ALIASES: Record<string, string[]> = {
  data_registro: ['datargistro', 'dataregistro', 'data', 'datalancamento', 'datacompra', 'dt'],
  colaborador:   ['colaborador', 'local', 'passageiro', 'nome', 'funcionario'],
  centro_custo:  ['centrocusto', 'ccusto', 'cc', 'codigocentrodecusto', 'codcc'],
  projeto_obra:  ['projetoobra', 'obra', 'projeto', 'centrocustodescricao', 'ccdescricao'],
  fornecedor:    ['fornecedor', 'cartao', 'meio', 'meiopagamento'],
  cia_aerea:     ['ciaaerea', 'cia', 'companhiaaerea', 'companhia'],
  numero_bilhete:['numerobilhete', 'bilhete', 'nrobilhete', 'nb', 'nf', 'notafiscal'],
  localizador:   ['localizador', 'loc', 'pnr'],
  origem:        ['origem', 'cidadeorigem'],
  destino:       ['destino', 'cidadedestino'],
  data_ida:      ['dataida', 'ida'],
  data_volta:    ['datavolta', 'volta', 'retorno'],
  motivo_viagem: ['motivoviagem', 'motivo', 'item', 'finalidade', 'descricao'],
  tipo_despesa:  ['tipodespesa', 'tipo'],
  valor:         ['valor', 'valortotal', 'total', 'preco'],
  observacoes:   ['observacoes', 'obs', 'observacao', 'venc', 'vencimento'],
  uf_destino:    ['ufdestino', 'uf'],
};

function buildHeaderMap(rawKeys: string[]): Record<string, string> {
  // Retorna { campoCanonico: chaveOriginalNoArquivo }
  const map: Record<string, string> = {};
  const indexed = rawKeys.map((k) => ({ orig: k, norm: normKey(k) }));
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const found = indexed.find((i) => i.norm === alias);
      if (found) { map[field] = found.orig; break; }
    }
  }
  return map;
}

function normalizeDate(v: any): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return null;
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

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function ImportarPassagensDialog({ open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<RowResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [filtroMes, setFiltroMes] = useState<string>('all'); // '1'..'12' ou 'all'
  const [filtroAno, setFiltroAno] = useState<string>('all');
  const [headerInfo, setHeaderInfo] = useState<{ mapped: Record<string,string>; missing: string[] } | null>(null);

  const reset = () => {
    setFileName('');
    setRows([]);
    setProgress(0);
    setProgressLabel('');
    setHeaderInfo(null);
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
      const sheetName = wb.SheetNames.includes('Passagens') ? 'Passagens' : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, raw: true });

      const rawKeys = json.length ? Object.keys(json[0]) : [];
      const headerMap = buildHeaderMap(rawKeys);
      const missing = ['data_registro', 'colaborador', 'valor'].filter((k) => !headerMap[k]);
      setHeaderInfo({ mapped: headerMap, missing });

      const get = (raw: Record<string, any>, field: string) => {
        const k = headerMap[field];
        return k ? raw[k] : undefined;
      };

      const results: RowResult[] = json.map((raw, idx) => {
        const linha = idx + 2;
        const allEmpty = Object.values(raw).every((v) => v === null || v === undefined || v === '');
        if (allEmpty) return { linha, ok: false, erro: '__empty__' };

        const colaborador = strOrNull(get(raw, 'colaborador'));
        const rawTipo = strOrNull(get(raw, 'tipo_despesa'));
        // Mapeia o tipo: se não bater com a lista, classifica automaticamente.
        let tipo_despesa: string = 'Aéreo';
        if (rawTipo) {
          const exact = TIPO_DESPESA_OPTIONS.find(
            (t) => t.toLowerCase() === rawTipo.toLowerCase(),
          );
          if (exact) {
            tipo_despesa = exact;
          } else {
            const t = rawTipo.toLowerCase();
            if (t.includes('onibus') || t.includes('ônibus') || t.includes('bus') || t.includes('rodovi')) {
              tipo_despesa = 'Ônibus';
            } else if (t.includes('aer') || t.includes('voo') || t.includes('passagem')) {
              tipo_despesa = 'Aéreo';
            } else {
              tipo_despesa = 'Outros';
            }
          }
        }
        const data_registro = normalizeDate(get(raw, 'data_registro'));
        const valor = normalizeNumber(get(raw, 'valor'));

        const errs: string[] = [];
        if (!colaborador) errs.push('colaborador/local vazio');
        if (!data_registro) errs.push('data inválida');
        if (valor === null || valor < 0) errs.push('valor inválido');

        if (errs.length) return { linha, ok: false, erro: errs.join('; ') };

        // Observações: agrega vencimento + NF se ambos existem e NF foi mapeado em outro lugar
        const obsParts: string[] = [];
        const obsBase = strOrNull(get(raw, 'observacoes'));
        if (obsBase) obsParts.push(obsBase);

        // Sanitiza cia_aerea: se vier preenchida com uma categoria (AÉREO/ÔNIBUS/HOTEL/LOCAÇÃO),
        // trata como tipo_despesa e limpa o campo cia_aerea
        let ciaAereaResolvida = strOrNull(get(raw, 'cia_aerea'));
        const obsExtras: string[] = [];
        if (ciaAereaResolvida) {
          const c = ciaAereaResolvida.toUpperCase();
          if (c === 'AÉREO' || c === 'AEREO') {
            tipo_despesa = 'Aéreo'; ciaAereaResolvida = null;
          } else if (c === 'ÔNIBUS' || c === 'ONIBUS') {
            tipo_despesa = 'Ônibus'; ciaAereaResolvida = null;
          } else if (c === 'HOTEL' || c.startsWith('LOCAÇÃO') || c.startsWith('LOCACAO')) {
            tipo_despesa = 'Outros';
            obsExtras.push(`Categoria original: ${ciaAereaResolvida}`);
            ciaAereaResolvida = null;
          }
        }

        const data: ParsedRow = {
          data_registro,
          colaborador: colaborador!.toUpperCase(),
          centro_custo: strOrNull(get(raw, 'centro_custo')),
          projeto_obra: strOrNull(get(raw, 'projeto_obra')),
          fornecedor: strOrNull(get(raw, 'fornecedor')),
          cia_aerea: ciaAereaResolvida,
          numero_bilhete: strOrNull(get(raw, 'numero_bilhete')),
          localizador: strOrNull(get(raw, 'localizador')),
          origem: strOrNull(get(raw, 'origem')),
          destino: strOrNull(get(raw, 'destino')),
          data_ida: normalizeDate(get(raw, 'data_ida')),
          data_volta: normalizeDate(get(raw, 'data_volta')),
          motivo_viagem: strOrNull(get(raw, 'motivo_viagem')),
          tipo_despesa: tipo_despesa!,
          valor: valor!,
          observacoes: obsParts.length ? obsParts.join(' | ') : null,
          uf_destino: (() => {
            const u = strOrNull(get(raw, 'uf_destino'));
            if (u && /^[A-Z]{2}$/i.test(u)) return u.toUpperCase();
            const dest = strOrNull(get(raw, 'destino'));
            if (!dest) return null;
            return geocodeCidade(nomeNormalizado(dest))?.uf ?? null;
          })(),
        };
        return { linha, ok: true, data };
      }).filter((r) => r.erro !== '__empty__');

      setRows(results);

      // Auto-seleciona mês/ano dominantes
      const counts = new Map<string, number>();
      results.forEach((r) => {
        if (r.ok && r.data?.data_registro) {
          const [y, m] = r.data.data_registro.split('-');
          const key = `${y}-${m}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      });
      let bestKey: string | null = null;
      let bestCount = 0;
      counts.forEach((c, k) => { if (c > bestCount) { bestCount = c; bestKey = k; } });
      if (bestKey) {
        const [y, m] = bestKey.split('-');
        setFiltroAno(y);
        setFiltroMes(String(Number(m)));
      } else {
        setFiltroAno('all');
        setFiltroMes('all');
      }
    } catch (err: any) {
      toast({ title: 'Erro ao ler planilha', description: err.message, variant: 'destructive' });
      reset();
    } finally {
      setParsing(false);
    }
  };

  const inPeriodo = (r: RowResult) => {
    if (!r.ok || !r.data?.data_registro) return false;
    const [y, m] = r.data.data_registro.split('-');
    if (filtroAno !== 'all' && y !== filtroAno) return false;
    if (filtroMes !== 'all' && Number(m) !== Number(filtroMes)) return false;
    return true;
  };

  const validRows = rows.filter((r) => r.ok && inPeriodo(r));
  const foraPeriodo = rows.filter((r) => r.ok && !inPeriodo(r));
  const errorRows = rows.filter((r) => !r.ok);

  const anosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.ok && r.data?.data_registro) set.add(r.data.data_registro.slice(0, 4)); });
    return Array.from(set).sort();
  }, [rows]);

  const dateRange = useMemo(() => {
    const ds = rows.filter((r) => r.ok && r.data?.data_registro).map((r) => r.data!.data_registro!).sort();
    return ds.length ? { min: ds[0], max: ds[ds.length - 1] } : null;
  }, [rows]);

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
      if (error) { failed += chunk.length; errors.push(error.message); }
      else { inserted += chunk.length; }
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
            Aceita o modelo padrão e também planilhas tipo "Relatório Cartão" (DATA, LOCAL, ITEM, CENTRO CUSTO, C.CUSTO, VALOR, NF, CARTÃO, VENC.).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="text-sm text-muted-foreground">Não tem o modelo? Baixe e preencha:</div>
            <a
              href="/modelo-importacao-passagens-aereas.xlsx"
              download
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Download className="h-4 w-4" /> Baixar modelo
            </a>
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
              <p className="mt-1 text-xs text-muted-foreground">
                Arquivo: {fileName}
                {dateRange && <> · Datas no arquivo: {dateRange.min} a {dateRange.max}</>}
              </p>
            )}
            {headerInfo && headerInfo.missing.length > 0 && (
              <p className="mt-1 text-xs text-destructive">
                Colunas obrigatórias não encontradas: {headerInfo.missing.join(', ')}
              </p>
            )}
          </div>

          {parsing && <p className="text-sm text-muted-foreground">Lendo planilha...</p>}

          {rows.length > 0 && !parsing && (
            <>
              <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs">Mês</Label>
                  <Select value={filtroMes} onValueChange={setFiltroMes}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {MESES.map((nome, idx) => (
                        <SelectItem key={idx + 1} value={String(idx + 1)}>{nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-xs">Ano</Label>
                  <Select value={filtroAno} onValueChange={setFiltroAno}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {anosDisponiveis.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-4">
                <div className="rounded-md border p-2">
                  <div className="text-xs text-muted-foreground">Total no arquivo</div>
                  <div className="text-lg font-semibold">{rows.length}</div>
                </div>
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                  <div className="text-xs text-muted-foreground">Para importar</div>
                  <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{validRows.length}</div>
                </div>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                  <div className="text-xs text-muted-foreground">Fora do período</div>
                  <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">{foraPeriodo.length}</div>
                </div>
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                  <div className="text-xs text-muted-foreground">Com erro</div>
                  <div className="text-lg font-semibold text-destructive">{errorRows.length}</div>
                </div>
              </div>

              {errorRows.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="mb-1 flex items-center gap-1 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Linhas com erro (ignoradas)
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
                    Pré-visualização (5 primeiras de {validRows.length})
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>CC</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validRows.slice(0, 5).map((r) => (
                          <TableRow key={r.linha}>
                            <TableCell className="text-xs">{r.data!.data_registro}</TableCell>
                            <TableCell className="text-xs">{r.data!.colaborador}</TableCell>
                            <TableCell className="text-xs">{r.data!.motivo_viagem ?? '-'}</TableCell>
                            <TableCell className="text-xs">{r.data!.centro_custo ?? r.data!.projeto_obra ?? '-'}</TableCell>
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
