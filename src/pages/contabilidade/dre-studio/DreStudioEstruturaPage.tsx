import { useParams } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { Plus, X, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCreateLinha, useDeleteLinha, useModelo, useRemoverConta,
  useReordenarLinhas, useUpdateLinha, useVincularConta,
} from "@/hooks/contabil/api";
import { useVincularContasDRESenior } from "@/hooks/contabil/useVincularContasDRESenior";
import { toast } from "sonner";
import { LinhaDialog } from "@/components/contabil/LinhaDialog";
import { PlanoContasPanel } from "@/components/contabil/PlanoContasPanel";
import { EstruturaTree, type EstruturaTreeHandle } from "@/components/contabil/EstruturaTree";
import type { LinhaModelo, TipoLinha } from "@/types/contabil";

function EstruturaEditor() {
  const { id } = useParams() as any;
  const { data, isLoading } = useModelo(id);
  const createLinha = useCreateLinha(id);
  const updateLinha = useUpdateLinha(id);
  const deleteLinha = useDeleteLinha(id);
  const removerConta = useRemoverConta(id);
  const vincularConta = useVincularConta(id);
  const reordenar = useReordenarLinhas(id);
  const vincularDRE = useVincularContasDRESenior(id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLinha, setEditingLinha] = useState<Partial<LinhaModelo>>({});
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [confirmVincDRE, setConfirmVincDRE] = useState(false);
  const treeRef = useRef<EstruturaTreeHandle>(null);

  const linhas = data?.linhas ?? [];
  const contas = data?.contas ?? [];
  const tipo = data?.modelo?.tipo_modelo ?? "DRE";

  const selectedLinha = useMemo(
    () => linhas.find((l) => l.id === selectedId) ?? null,
    [linhas, selectedId],
  );
  const contasSelecionadas = useMemo(
    () => contas.filter((c) => c.linha_id === selectedId),
    [contas, selectedId],
  );

  const modeloValido = !!data?.modelo?.id;

  const openNew = (tipo_linha: TipoLinha) => {
    if (!modeloValido) return;
    const sibs = linhas.filter((l) => l.linha_pai_id === (selectedLinha?.id ?? null));
    setEditingLinha({
      tipo_linha,
      linha_pai_id: selectedLinha?.id ?? null,
      ordem: sibs.length,
      sinal: 1,
      exibir: true,
      negrito: tipo_linha === "TOTAL" || tipo_linha === "SUBTOTAL",
    });
    setDialogOpen(true);
  };

  const openEdit = (l: LinhaModelo) => {
    setEditingLinha(l);
    setDialogOpen(true);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex">
      <div className="flex-1 min-w-0 flex flex-col h-full bg-white border-r relative">
        <div className="p-3 border-b flex flex-wrap items-center gap-2">
          <div className="font-semibold text-sm mr-2">Estrutura</div>
          {([
            ["GRUPO", "Grupo"],
            ["ANALITICA", "Linha"],
            ["SUBTOTAL", "Subtotal"],
            ["TOTAL", "Total"],
            ["FORMULA", "Fórmula"],
          ] as const).map(([t, label]) => (
            <Button
              key={t}
              size="sm"
              variant="outline"
              onClick={() => openNew(t)}
              disabled={!modeloValido || vincularDRE.isPending}
              title={!modeloValido ? "Selecione ou crie um modelo antes de continuar" : undefined}
            >
              <Plus className="h-3 w-3 mr-1" /> {label}
            </Button>
          ))}
          {tipo === "DRE" && (
            <Button
              size="sm"
              onClick={() => setConfirmVincDRE(true)}
              disabled={!modeloValido || vincularDRE.isPending}
              title="Cria linhas analíticas e vincula contas do plano Senior automaticamente."
            >
              {vincularDRE.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Link2 className="h-3 w-3 mr-1" />
              )}
              Vincular Contas Senior
            </Button>
          )}
          <div className="text-[11px] text-slate-400 ml-auto">
            Arraste pelo <span className="font-mono">⋮⋮</span> para reordenar
          </div>
        </div>

        {vincularDRE.isPending && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-3 bg-white border rounded-md shadow px-4 py-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium text-slate-700">Vinculando contas da DRE...</span>
            </div>
          </div>
        )}


        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : linhas.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhuma linha. Clique em <strong>+ Grupo</strong> ou <strong>+ Linha</strong> para começar.
            </div>
          ) : (
            <EstruturaTree
              ref={treeRef}
              linhas={linhas}
              contas={contas}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onEdit={openEdit}
              onDelete={(linhaId) => setToDelete(linhaId)}
              onReorder={(updates) => reordenar.mutate(updates)}
            />
          )}
        </div>

        <div className="border-t bg-slate-50 p-3 max-h-[35%] overflow-auto">
          <div className="text-xs font-semibold text-slate-600 mb-2">
            Contas vinculadas {selectedLinha ? `— ${selectedLinha.descricao}` : ""}
          </div>
          {!selectedLinha ? (
            <div className="text-xs text-slate-500">Selecione uma linha para ver/editar vínculos.</div>
          ) : contasSelecionadas.length === 0 ? (
            <div className="text-xs text-slate-500">Nenhuma conta vinculada.</div>
          ) : (
            <div className="space-y-1">
              {contasSelecionadas.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs bg-white border rounded px-2 py-1">
                  <span className="truncate flex-1">
                    {[c.ctared, c.clacta, c.descta].filter(Boolean).join(" - ")}
                  </span>
                  <span className="text-slate-400">{c.sinal === -1 ? "−" : "+"}</span>
                  {c.incluir_subcontas && <Badge variant="outline" className="h-4 text-[10px]">+sub</Badge>}
                  <Button
                    variant="ghost" size="sm" className="h-5 w-5 p-0"
                    onClick={() => removerConta.mutate({ linhaId: selectedLinha.id, contaId: c.id })}
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-[440px] shrink-0 h-full">
        <PlanoContasPanel modeloId={id} tipo={tipo} selectedLinha={selectedLinha} />
      </div>

      <LinhaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingLinha}
        parents={linhas}
        tipoModelo={tipo}
        linhasExistentes={linhas}
        isSubmitting={createLinha.isPending || updateLinha.isPending || vincularConta.isPending}
        onSubmit={async (d, extras) => {
          try {
            if (editingLinha.id) {
              await updateLinha.mutateAsync({ id: editingLinha.id, ...d });
            } else {
              const created = await createLinha.mutateAsync(d);
              const linhaCriada = (created as any)?.dados ?? created;
              const novaId = linhaCriada?.id;
              const novoPaiId = linhaCriada?.linha_pai_id ?? d.linha_pai_id ?? null;
              if (novoPaiId) treeRef.current?.expand(novoPaiId);
              if (novaId) setSelectedId(novaId);
              if (extras?.tipoOrigem === "CONTA_CONTABIL" && extras.conta && novaId) {
                try {
                  await vincularConta.mutateAsync({ linhaId: novaId, conta: extras.conta });
                } catch (e) {
                  const err = e as { status?: number };
                  if (err?.status === 409) {
                    toast.warning("Esta conta contábil já está vinculada neste modelo.");
                  }
                }
              }
            }
            setDialogOpen(false);
          } catch (e) {
            const err = e as { status?: number };
            if (err?.status === 409) {
              toast.error("Este código já existe neste modelo.");
            }
          }
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir linha?</AlertDialogTitle>
            <AlertDialogDescription>
              As contas vinculadas a esta linha também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (toDelete) deleteLinha.mutate(toDelete);
              setToDelete(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmVincDRE} onOpenChange={setConfirmVincDRE}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vincular contas da DRE?</AlertDialogTitle>
            <AlertDialogDescription>
              Linhas analíticas serão criadas automaticamente conforme o plano Senior
              e as contas serão vinculadas. Reexecutar é seguro — contas já existentes
              não são duplicadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => vincularDRE.mutate()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default EstruturaEditor;

