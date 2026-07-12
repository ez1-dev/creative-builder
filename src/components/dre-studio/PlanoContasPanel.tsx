import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanoContas, useVincularConta } from "@/hooks/contabil/api";
import type { LinhaModelo, PlanoContaItem, TipoModelo } from "@/types/contabil";
import { CODEMP } from "@/lib/contabilConfig";
import { cn } from "@/lib/utils";

function normalize(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.\-/\s]/g, "");
}

const CAMPOS_BUSCA = [
  "ctared",
  "clacta",
  "descta",
  "descricao",
  "codigo",
  "codigo_contabil",
  "label",
] as const;

function matchConta(item: PlanoContaItem, termo: string): boolean {
  if (!termo) return true;
  const rec = item as unknown as Record<string, unknown>;
  let buf = "";
  for (const c of CAMPOS_BUSCA) buf += normalize(rec[c]);
  return buf.includes(termo);
}

interface TreeNode {
  key: string;
  conta?: PlanoContaItem;
  children: TreeNode[];
  parts: string[];
}

function buildTree(items: PlanoContaItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();
  const sorted = [...items].sort((a, b) => a.clacta.localeCompare(b.clacta));
  for (const c of sorted) {
    const parts = c.clacta.split(".");
    let cur: TreeNode[] = root;
    let path = "";
    for (let i = 0; i < parts.length; i++) {
      path = path ? `${path}.${parts[i]}` : parts[i];
      let node = map.get(path);
      if (!node) {
        node = { key: path, children: [], parts: parts.slice(0, i + 1) };
        map.set(path, node);
        cur.push(node);
      }
      if (i === parts.length - 1) node.conta = c;
      cur = node.children;
    }
  }
  return root;
}

export function PlanoContasPanel({
  modeloId,
  tipo,
  selectedLinha,
}: {
  modeloId: string;
  tipo: TipoModelo;
  selectedLinha: LinhaModelo | null;
}) {
  const [busca, setBusca] = useState("");
  const [somenteAtivas, setSomenteAtivas] = useState(true);
  const [somenteAnaliticas, setSomenteAnaliticas] = useState(false);
  const [incluirSubcontas, setIncluirSubcontas] = useState(false);
  const [sinal, setSinal] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const q = usePlanoContas(tipo, {
    somente_ativas: somenteAtivas,
    somente_analiticas: somenteAnaliticas,
  });
  const vincular = useVincularConta(modeloId);

  const termoNorm = useMemo(() => normalize(busca), [busca]);

  const dadosFiltrados = useMemo(() => {
    const all = q.data?.dados ?? [];
    if (!termoNorm) return all;
    return all.filter((c) => matchConta(c, termoNorm));
  }, [q.data, termoNorm]);

  const tree = useMemo(() => buildTree(dadosFiltrados), [dadosFiltrados]);

  // Auto-expandir ancestrais dos matches quando há busca; recolher ao limpar
  useEffect(() => {
    if (!termoNorm) {
      setExpanded(new Set());
      return;
    }
    const next = new Set<string>();
    for (const c of dadosFiltrados) {
      const parts = c.clacta.split(".");
      let path = "";
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}.${parts[i]}` : parts[i];
        next.add(path);
      }
    }
    setExpanded(next);
  }, [termoNorm, dadosFiltrados]);


  const toggleExpand = (k: string) => {
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const toggleSelect = (k: string, conta: PlanoContaItem | undefined) => {
    if (!conta) return;
    const isAnalitica = conta.eh_analitica === 1 || conta.anasin === "A";
    if (!isAnalitica && !incluirSubcontas) return;
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const handleVincular = async () => {
    if (!selectedLinha) return;
    const flat = (q.data?.dados ?? []).filter((c) => selected.has(c.clacta));
    for (const c of flat) {
      try {
        await vincular.mutateAsync({
          linhaId: selectedLinha.id,
          conta: {
            codemp: CODEMP,
            ctared: c.ctared,
            clacta: c.clacta,
            descta: c.descta,
            nivcta: c.nivcta,
            anasin: c.anasin,
            incluir_subcontas: incluirSubcontas,
            sinal,
          },
        });
      } catch {
        // toast handled in mutation
      }
    }
    setSelected(new Set());
  };

  const renderNode = (n: TreeNode, depth: number): React.ReactNode => {
    const isAnalitica = n.conta?.eh_analitica === 1 || n.conta?.anasin === "A";
    const canSelect = !!n.conta && (isAnalitica || incluirSubcontas);
    const isExpanded = expanded.has(n.key);
    return (
      <div key={n.key}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 hover:bg-slate-50 text-sm",
            !canSelect && "text-slate-500",
          )}
          style={{ paddingLeft: depth * 16 + 8 }}
        >
          {n.children.length > 0 ? (
            <button onClick={() => toggleExpand(n.key)} className="p-0.5">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Checkbox
            checked={selected.has(n.key)}
            disabled={!canSelect}
            onCheckedChange={() => toggleSelect(n.key, n.conta)}
          />
          {n.conta?.ctared != null && (
            <span className="font-mono text-xs text-slate-400 w-16 shrink-0">{n.conta.ctared}</span>
          )}
          <span className="font-mono text-xs text-slate-500">{n.parts.join(".")}</span>
          <span className="truncate">{n.conta?.descta ?? <em className="text-slate-400">(sintética)</em>}</span>
          {n.conta && (
            <span className={cn(
              "ml-auto text-[10px] uppercase font-semibold",
              isAnalitica ? "text-emerald-600" : "text-slate-400",
            )}>{isAnalitica ? "A" : "S"}</span>
          )}
        </div>
        {isExpanded && n.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-l">
      <div className="p-3 border-b space-y-2">
        <div className="font-semibold text-sm">Plano de Contas ({tipo})</div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 h-9"
            placeholder="Buscar conta..."
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1">
            <Switch checked={somenteAtivas} onCheckedChange={setSomenteAtivas} />
            Ativas
          </label>
          <label className="flex items-center gap-1">
            <Switch checked={somenteAnaliticas} onCheckedChange={setSomenteAnaliticas} />
            Só analíticas
          </label>
        </div>
        <div className="text-[11px] text-slate-500">
          {dadosFiltrados.length} de {q.data?.dados?.length ?? 0} contas
          {termoNorm && q.data?.dados?.length ? " (filtro local)" : ""}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {q.isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : q.isError ? (
          <div className="p-4 text-sm text-red-600">Erro ao carregar plano de contas.</div>
        ) : dadosFiltrados.length === 0 && termoNorm ? (
          <div className="p-4 text-xs text-slate-500">
            Nenhuma conta encontrada para “{busca}”. Verifique se os filtros “Ativas” / “Só analíticas” não estão restringindo demais.
          </div>
        ) : (
          tree.map((n) => renderNode(n, 0))
        )}
      </div>


      <div className="border-t p-3 space-y-2 bg-slate-50">
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <Switch checked={incluirSubcontas} onCheckedChange={setIncluirSubcontas} />
            Incluir subcontas
          </label>
          <div className="flex items-center gap-1">
            <Label className="text-xs">Sinal:</Label>
            <Button size="sm" variant={sinal === 1 ? "default" : "outline"} onClick={() => setSinal(1)}>+</Button>
            <Button size="sm" variant={sinal === -1 ? "default" : "outline"} onClick={() => setSinal(-1)}>−</Button>
          </div>
        </div>
        <Button
          className="w-full"
          disabled={!selectedLinha || selected.size === 0 || vincular.isPending}
          onClick={handleVincular}
        >
          <Plus className="h-4 w-4 mr-1" />
          Vincular {selected.size > 0 ? `(${selected.size})` : ""} à linha selecionada
        </Button>
        {!selectedLinha && (
          <div className="text-[11px] text-slate-500 text-center">
            Selecione uma linha na árvore à esquerda.
          </div>
        )}
      </div>
    </div>
  );
}
