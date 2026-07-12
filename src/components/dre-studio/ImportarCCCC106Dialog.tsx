import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Upload } from "lucide-react";
import { fmtBRL } from "@/components/contabil/MoneyCell";
import {
  useImportarCCCC106Manual,
  type CCCC106LinhaImport,
} from "@/hooks/contabil/useCCCC106";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modeloId: string;
  anomes: number;
  codemp: number;
  codfil: number;
}

// Header aliases (lowercase, sem acento)
const ALIASES: Record<keyof CCCC106LinhaImport, string[]> = {
  codigo: ["classificacao contabil", "classificacao", "codigo", "código", "cod"],
  ctared: ["conta contabil", "conta", "ctared", "cta red"],
  clacta: ["clacta"],
  descricao: ["descricao", "descrição", "desc", "nome conta"],
  tipo: ["tipo"],
  natureza: ["natureza"],
  saldo_anterior: ["saldo anterior", "sld anterior"],
  debito: ["debito", "débito"],
  credito: ["credito", "crédito"],
  saldo_final: ["saldo final", "saldo atual"],
};

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseNumeroBR(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s) return null;
  // Negativo entre parênteses
  let neg = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("C") || s.endsWith("c")) {
    neg = true;
    s = s.slice(0, -1).trim();
  } else if (s.endsWith("D") || s.endsWith("d")) {
    s = s.slice(0, -1).trim();
  }
  s = s.replace(/\s/g, "").replace(/R\$/i, "");
  // Formato BR: 1.234,56
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

interface ParseResult {
  linhas: CCCC106LinhaImport[];
  temSaldoFinal: boolean;
  erros: string[];
  headersDetectados: Record<string, string | null>;
}

function parseRows(rows: Array<Record<string, unknown>>): ParseResult {
  const result: ParseResult = { linhas: [], temSaldoFinal: false, erros: [], headersDetectados: {} };
  if (!rows.length) {
    result.erros.push("Nenhuma linha encontrada.");
    return result;
  }
  const headersRaw = Object.keys(rows[0]);
  const headersNorm = headersRaw.map(norm);

  // map field -> original header
  const map: Partial<Record<keyof CCCC106LinhaImport, string>> = {};
  (Object.keys(ALIASES) as Array<keyof CCCC106LinhaImport>).forEach((field) => {
    for (const alias of ALIASES[field]) {
      const idx = headersNorm.findIndex((h) => h === alias || h.includes(alias));
      if (idx >= 0) {
        map[field] = headersRaw[idx];
        break;
      }
    }
    result.headersDetectados[field] = map[field] ?? null;
  });

  if (!map.codigo) result.erros.push("Coluna 'Classificação Contábil' (codigo) não encontrada.");
  if (!map.descricao) result.erros.push("Coluna 'Descrição' não encontrada.");
  result.temSaldoFinal = !!map.saldo_final;

  if (result.erros.length) return result;

  for (const row of rows) {
    const codigo = String(row[map.codigo!] ?? "").trim();
    const descricao = String(row[map.descricao!] ?? "").trim();
    if (!codigo && !descricao) continue;
    const linha: CCCC106LinhaImport = {
      codigo,
      descricao,
      ctared: map.ctared ? (parseNumeroBR(row[map.ctared]) ?? null) : null,
      clacta: map.clacta ? String(row[map.clacta] ?? "").trim() || null : null,
      tipo: map.tipo ? String(row[map.tipo] ?? "").trim() || null : null,
      natureza: map.natureza ? String(row[map.natureza] ?? "").trim() || null : null,
      saldo_anterior: map.saldo_anterior ? parseNumeroBR(row[map.saldo_anterior]) : null,
      debito: map.debito ? parseNumeroBR(row[map.debito]) : null,
      credito: map.credito ? parseNumeroBR(row[map.credito]) : null,
      saldo_final: map.saldo_final ? (parseNumeroBR(row[map.saldo_final]) ?? 0) : 0,
    };
    result.linhas.push(linha);
  }
  return result;
}

function parseTSV(text: string): Array<Record<string, unknown>> {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  // Detectar separador: \t preferencial, senão ;
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim());
  const out: Array<Record<string, unknown>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    out.push(row);
  }
  return out;
}

export function ImportarCCCC106Dialog({ open, onOpenChange, modeloId, anomes, codemp, codfil }: Props) {
  const [tab, setTab] = useState<"colar" | "arquivo">("colar");
  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState<string>("");
  const [arquivoRows, setArquivoRows] = useState<Array<Record<string, unknown>> | null>(null);
  const [substituir, setSubstituir] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const importar = useImportarCCCC106Manual();

  const parsed = useMemo<ParseResult | null>(() => {
    if (tab === "colar") {
      if (!texto.trim()) return null;
      return parseRows(parseTSV(texto));
    }
    if (arquivoRows) return parseRows(arquivoRows);
    return null;
  }, [tab, texto, arquivoRows]);

  function handleArquivo(file: File) {
    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        setArquivoRows(json);
      } catch (e) {
        console.error(e);
        setArquivoRows(null);
      }
    };
    reader.readAsBinaryString(file);
  }

  function handleConfirmar() {
    if (!parsed || !parsed.temSaldoFinal || parsed.erros.length) return;
    importar.mutate(
      {
        modelo_id: modeloId,
        codemp,
        codfil,
        anomes,
        origem_arquivo: arquivoNome || `CCCC106_${anomes}_colado.tsv`,
        substituir_periodo: substituir,
        linhas: parsed.linhas,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTexto("");
          setArquivoNome("");
          setArquivoRows(null);
        },
      },
    );
  }

  const podeEnviar = !!parsed && parsed.temSaldoFinal && parsed.linhas.length > 0 && !parsed.erros.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar CCCC106 manualmente — competência {anomes}</DialogTitle>
        </DialogHeader>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Apoio à homologação</AlertTitle>
          <AlertDescription className="text-amber-800">
            Esta importação substitui a competência <strong>{anomes}</strong> em
            <code className="mx-1 rounded bg-amber-100 px-1">bi_contabil_cccc106_importado</code>.
            O fluxo recomendado é usar "Buscar CCCC106 no Senior".
          </AlertDescription>
        </Alert>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "colar" | "arquivo")}>
          <TabsList>
            <TabsTrigger value="colar">Colar TSV (Excel)</TabsTrigger>
            <TabsTrigger value="arquivo">Upload .xlsx/.csv</TabsTrigger>
          </TabsList>
          <TabsContent value="colar" className="space-y-2">
            <p className="text-xs text-slate-500">
              Cabeçalho esperado: Classificação Contábil, Conta Contábil, Descrição, Tipo, Natureza,
              Saldo Anterior, Débito, Crédito, <strong>Saldo Final</strong>.
            </p>
            <Textarea
              rows={10}
              placeholder="Cole aqui a tabela copiada do Excel..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="font-mono text-xs"
            />
          </TabsContent>
          <TabsContent value="arquivo" className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleArquivo(f);
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Selecionar arquivo
            </Button>
            {arquivoNome && <span className="ml-2 text-sm text-slate-600">{arquivoNome}</span>}
          </TabsContent>
        </Tabs>

        {parsed && !parsed.temSaldoFinal && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Saldo Final ausente</AlertTitle>
            <AlertDescription>
              Não é possível conciliar com o CCCC106 porque o arquivo não possui coluna de Saldo Final.
            </AlertDescription>
          </Alert>
        )}

        {parsed && parsed.erros.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erros de parsing</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {parsed.erros.map((er) => (
                  <li key={er}>{er}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {parsed && parsed.linhas.length > 0 && parsed.temSaldoFinal && (
          <div className="rounded border bg-white">
            <div className="px-3 py-2 text-xs text-slate-600 border-b">
              {parsed.linhas.length} linha(s) detectadas — preview das 20 primeiras
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Código</th>
                    <th className="px-2 py-1 text-left">Conta</th>
                    <th className="px-2 py-1 text-left">Descrição</th>
                    <th className="px-2 py-1 text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.linhas.slice(0, 20).map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1 font-mono">{l.codigo}</td>
                      <td className="px-2 py-1">{l.ctared ?? "—"}</td>
                      <td className="px-2 py-1">{l.descricao}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmtBRL(l.saldo_final)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} />
          Substituir registros existentes da competência {anomes}
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!podeEnviar || importar.isPending} onClick={handleConfirmar}>
            {importar.isPending ? "Enviando..." : `Importar ${parsed?.linhas.length ?? 0} linhas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
