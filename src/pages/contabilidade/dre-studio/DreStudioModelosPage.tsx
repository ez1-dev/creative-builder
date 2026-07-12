import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Plus, Pencil, BarChart3, Trash2, Search, Sparkles, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CriarDREPadraoDialog } from "@/components/contabil/CriarDREPadraoDialog";
import { CriarBalancoPadraoSeniorDialog } from "@/components/contabil/CriarBalancoPadraoSeniorDialog";


import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteModelo, useModelos, isValidId } from "@/hooks/contabil/api";
import type { TipoModelo } from "@/types/contabil";
import { ContasBadge } from "@/components/contabil/ContasBadge";

const dateFormatter = new Intl.DateTimeFormat("pt-BR");
function formatarData(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

function ModelosList() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoModelo | "TODOS">("TODOS");
  const [ativo, setAtivo] = useState<"true" | "false" | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [criarPadraoOpen, setCriarPadraoOpen] = useState(false);
  const [balancoSeniorOpen, setBalancoSeniorOpen] = useState(false);



  const { data, isLoading } = useModelos({ tipo_modelo: tipo, ativo });
  const del = useDeleteModelo();

  const items = (data ?? []).filter((m) => isValidId(m.id)).filter((m) =>
    busca ? m.nome.toLowerCase().includes(busca.toLowerCase()) : true,
  );

  const destaqueId = (() => {
    const ativos = (data ?? []).filter((m) => m.ativo && isValidId(m.id));
    if (ativos.length === 0) return null;
    const sorted = [...ativos].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
    return sorted[0]?.id ?? null;
  })();



  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Modelos</h1>
          <p className="text-sm text-slate-500">
            DRE e Balanço Patrimonial configuráveis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCriarPadraoOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Criar DRE Padrão
          </Button>
          <Button variant="outline" onClick={() => setBalancoSeniorOpen(true)}>
            <Landmark className="h-4 w-4 mr-1" /> Criar Balanço Padrão Senior
          </Button>
          <Button onClick={() => navigate("/contabilidade/dre-studio/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Novo Modelo
          </Button>
        </div>
      </div>

      <CriarDREPadraoDialog
        open={criarPadraoOpen}
        onOpenChange={setCriarPadraoOpen}
        onCreated={(m) => {
          setCriarPadraoOpen(false);
          navigate(`/contabilidade/dre-studio/modelo/${m.id}/estrutura`);
        }}
      />

      <CriarBalancoPadraoSeniorDialog
        open={balancoSeniorOpen}
        onOpenChange={setBalancoSeniorOpen}
        onCreated={(m) => {
          setBalancoSeniorOpen(false);
          navigate(`/contabilidade/dre-studio/modelo/${m.id}/estrutura`);
        }}
      />



      <div className="flex flex-wrap items-end gap-3 mb-4 p-3 rounded-lg border bg-white">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs text-slate-600">Buscar</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-8 h-9"
              placeholder="Nome do modelo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-600 block">Tipo</label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoModelo | "TODOS")}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="DRE">DRE</SelectItem>
              <SelectItem value="BALANCO">Balanço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-600 block">Ativo</label>
          <Select value={ativo} onValueChange={(v) => setAtivo(v as typeof ativo)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="true">Ativos</SelectItem>
              <SelectItem value="false">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contas</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-10">
                  Nenhum modelo. Clique em <strong>Novo Modelo</strong> para começar.
                </TableCell>
              </TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.id} className={m.id === destaqueId ? "bg-amber-50/60" : undefined}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{m.nome}</span>
                      {m.id === destaqueId && (
                        <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200">
                          Ativo mais recente
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={m.tipo_modelo === "DRE" ? "default" : "secondary"}>
                      {m.tipo_modelo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ContasBadge modeloId={m.id} />
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                    {m.descricao ?? "—"}
                  </TableCell>
                  <TableCell>
                    {m.ativo ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Sim</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                    {formatarData(m.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/contabilidade/contabilidade/dre-studio-studio/modelo/${m.id}/editar`}>
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/contabilidade/contabilidade/dre-studio-studio/modelo/${m.id}/visualizacao`}>
                          <BarChart3 className="h-4 w-4 mr-1" /> Visualizar
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToDelete(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Linhas e contas vinculadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) del.mutate(toDelete);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ModelosList;

