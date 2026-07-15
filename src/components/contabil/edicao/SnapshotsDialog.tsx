import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
import type { EscopoSnapshot } from "@/lib/contabil/estruturaEdicaoApi";

export interface SnapshotItem {
  id: string;
  nome: string;
  descricao: string | null;
  escopo: EscopoSnapshot;
  created_at: string;
  versao_origem?: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  podeEditarOficial: boolean;
  listar: () => Promise<SnapshotItem[]>;
  salvar: (params: { nome: string; descricao?: string; escopo: EscopoSnapshot }) => Promise<void>;
  restaurar: (id: string, destino: "rascunho" | "oficial") => Promise<void>;
  excluir: (id: string) => Promise<void>;
  onAfterRestore?: () => void;
}

export function SnapshotsDialog({ open, onClose, title, podeEditarOficial, listar, salvar, restaurar, excluir, onAfterRestore }: Props) {
  const [items, setItems] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<"lista" | "novo">("lista");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [escopo, setEscopo] = useState<EscopoSnapshot>("pessoal");
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try { setItems(await listar()); }
    catch (e: any) { toast.error(e?.message || "Falha ao carregar versões"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!open) return;
    setModo("lista");
    setNome(""); setDescricao(""); setEscopo("pessoal");
    carregar();
  }, [open]);

  const onSalvar = async () => {
    if (!nome.trim()) { toast.error("Informe o nome da versão"); return; }
    setSaving(true);
    try {
      await salvar({ nome: nome.trim(), descricao: descricao.trim() || undefined, escopo });
      toast.success("Versão salva");
      setModo("lista");
      await carregar();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar versão");
    } finally { setSaving(false); }
  };

  const onRestaurar = async (id: string, destino: "rascunho" | "oficial") => {
    const msg = destino === "oficial"
      ? "Restaurar esta versão SUBSTITUI a estrutura oficial. Um backup automático é criado. Continuar?"
      : "Restaurar como seu rascunho pessoal (sobrescreve rascunho atual)?";
    if (!confirm(msg)) return;
    try {
      await restaurar(id, destino);
      toast.success("Versão restaurada");
      onAfterRestore?.();
      onClose();
    } catch (e: any) { toast.error(e?.message || "Falha ao restaurar"); }
  };

  const onExcluir = async (id: string) => {
    if (!confirm("Excluir esta versão? Ação irreversível.")) return;
    try { await excluir(id); await carregar(); toast.success("Versão excluída"); }
    catch (e: any) { toast.error(e?.message || "Falha ao excluir"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>

        {modo === "lista" ? (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setModo("novo")}>Salvar versão atual</Button>
            </div>
            <div className="max-h-[420px] overflow-auto rounded border">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Carregando…</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma versão salva ainda.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2">Nome</th>
                      <th className="p-2 w-24">Escopo</th>
                      <th className="p-2 w-36">Data</th>
                      <th className="p-2 w-56 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-accent/30">
                        <td className="p-2">
                          <div className="font-medium">{s.nome}</div>
                          {s.descricao && <div className="text-[10px] text-muted-foreground">{s.descricao}</div>}
                        </td>
                        <td className="p-2">
                          <Badge variant={s.escopo === "oficial" ? "default" : "secondary"} className="text-[10px]">
                            {s.escopo}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}</td>
                        <td className="p-2 text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => onRestaurar(s.id, "rascunho")} title="Restaurar como meu rascunho">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />rascunho
                          </Button>
                          {podeEditarOficial && (
                            <Button size="sm" variant="ghost" onClick={() => onRestaurar(s.id, "oficial")} title="Substituir estrutura oficial">
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />oficial
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => onExcluir(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome da versão</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Fechamento 2026-Q1" />
            </div>
            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Escopo</Label>
              <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as EscopoSnapshot)} className="mt-1 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="pessoal" /> Pessoal (só eu vejo)
                </label>
                {podeEditarOficial && (
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="oficial" /> Oficial (todos veem)
                  </label>
                )}
              </RadioGroup>
            </div>
          </div>
        )}

        <DialogFooter>
          {modo === "novo" ? (
            <>
              <Button variant="outline" onClick={() => setModo("lista")}>Voltar</Button>
              <Button onClick={onSalvar} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
