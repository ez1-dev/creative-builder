import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ColaboradorDetalhe, DrillDimension } from "@/lib/rh/quadroDashboardApi";
import { QuadroDrillModal } from "./QuadroDrillModal";

function normalizaValor(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return "Não informado";
  return String(v);
}
function isMasculino(x: any) {
  const s = String(x.sexo ?? "").toLowerCase();
  return s === "m" || s.includes("masculino");
}
function isFeminino(x: any) {
  const s = String(x.sexo ?? "").toLowerCase();
  return s === "f" || s.includes("feminino");
}
function isPCD(x: any) {
  const s = String(x.pcd ?? "").toLowerCase();
  return s === "s" || s === "sim" || s === "true" || s === "1";
}
function isEstagiario(x: any) {
  const s = String(x.vinculo ?? "").toLowerCase();
  return s.includes("estagi");
}
function isAprendiz(x: any) {
  const s = String(x.vinculo ?? "").toLowerCase();
  return s.includes("aprendiz");
}

function agruparPorDimensao(detalhe: ColaboradorDetalhe[], chave: string) {
  const grupos = new Map<string, ColaboradorDetalhe[]>();
  for (const item of detalhe ?? []) {
    const valor = normalizaValor((item as any)[chave]);
    if (!grupos.has(valor)) grupos.set(valor, []);
    grupos.get(valor)!.push(item);
  }
  return Array.from(grupos.entries())
    .map(([valor, itens]) => ({
      valor,
      colaboradores: itens.length,
      homens: itens.filter(isMasculino).length,
      mulheres: itens.filter(isFeminino).length,
      pcd: itens.filter(isPCD).length,
      estagiarios: itens.filter(isEstagiario).length,
      jovem_aprendiz: itens.filter(isAprendiz).length,
      itens,
    }))
    .sort((a, b) => b.colaboradores - a.colaboradores);
}

interface Props {
  dimensoes: DrillDimension[];
  detalhe: ColaboradorDetalhe[];
  loading?: boolean;
}

export function QuadroDrillCard({ dimensoes, detalhe, loading }: Props) {
  const defaultChave = useMemo(() => {
    if (!dimensoes || dimensoes.length === 0) return "";
    return dimensoes.find((d) => d.chave === "empresa")?.chave ?? dimensoes[0].chave;
  }, [dimensoes]);

  const [chaveSel, setChaveSel] = useState<string>(defaultChave);
  const chave = chaveSel || defaultChave;

  const [modal, setModal] = useState<{ open: boolean; valor: string; itens: ColaboradorDetalhe[] }>({
    open: false,
    valor: "",
    itens: [],
  });

  const dimAtual = dimensoes?.find((d) => d.chave === chave);
  const label = dimAtual?.label ?? chave;

  const grupos = useMemo(
    () => (chave ? agruparPorDimensao(detalhe ?? [], chave) : []),
    [detalhe, chave],
  );

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lista de Drills</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dimensoes || dimensoes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lista de Drills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Drills ainda não disponíveis na API.</p>
        </CardContent>
      </Card>
    );
  }

  if (!detalhe || detalhe.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lista de Drills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Sem colaboradores para detalhar.</p>
        </CardContent>
      </Card>
    );
  }

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">Drill por {label}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Drill por...</span>
            <Select value={chave} onValueChange={setChaveSel}>
              <SelectTrigger className="w-[220px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dimensoes.map((d) => (
                  <SelectItem key={d.chave} value={d.chave}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{label}</TableHead>
                  <TableHead className="text-right">Colaboradores</TableHead>
                  <TableHead className="text-right">Homens</TableHead>
                  <TableHead className="text-right">Mulheres</TableHead>
                  <TableHead className="text-right">PCD</TableHead>
                  <TableHead className="text-right">Estagiários</TableHead>
                  <TableHead className="text-right">Jovem Aprendiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map((g) => (
                  <TableRow
                    key={g.valor}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setModal({ open: true, valor: g.valor, itens: g.itens })
                    }
                  >
                    <TableCell className="font-medium">{g.valor}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(g.colaboradores)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(g.homens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(g.mulheres)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(g.pcd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(g.estagiarios)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(g.jovem_aprendiz)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <QuadroDrillModal
        open={modal.open}
        onOpenChange={(v) => setModal((m) => ({ ...m, open: v }))}
        label={label}
        valor={modal.valor}
        itens={modal.itens}
      />
    </>
  );
}
