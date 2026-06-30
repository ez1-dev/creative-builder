import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { criarFormulario } from "@/lib/rh/api";
import { Plus, Loader2 } from "lucide-react";

const TIPOS = [
  { value: "FERIAS", label: "Férias" },
  { value: "CONTRATO_EXPERIENCIA", label: "Contrato Experiência" },
  { value: "ATESTADO", label: "Atestado" },
  { value: "ALTERACAO_CADASTRAL", label: "Alteração Cadastral" },
  { value: "OUTROS", label: "Outros" },
];
const STATUS = ["ABERTO", "EM_ANALISE", "CONCLUIDO", "CANCELADO"];

export function FormularioDialog() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    cd_tp_formulario: "FERIAS",
    ds_titulo: "",
    ds_descricao: "",
    cd_matricula: "",
    ds_colaborador: "",
    cd_status: "ABERTO",
  });

  const mut = useMutation({
    mutationFn: () => criarFormulario(form),
    onSuccess: () => {
      toast({ title: "Formulário criado" });
      qc.invalidateQueries({ queryKey: ["rh", "formularios"] });
      setOpen(false);
      setForm({ cd_tp_formulario: "FERIAS", ds_titulo: "", ds_descricao: "", cd_matricula: "", ds_colaborador: "", cd_status: "ABERTO" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo formulário</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo formulário</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-1">
            <Label>Tipo</Label>
            <Select value={form.cd_tp_formulario} onValueChange={(v) => setForm({ ...form, cd_tp_formulario: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Label>Status</Label>
            <Select value={form.cd_status} onValueChange={(v) => setForm({ ...form, cd_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Título</Label>
            <Input value={form.ds_titulo} onChange={(e) => setForm({ ...form, ds_titulo: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={4} value={form.ds_descricao} onChange={(e) => setForm({ ...form, ds_descricao: e.target.value })} />
          </div>
          <div>
            <Label>Matrícula</Label>
            <Input value={form.cd_matricula} onChange={(e) => setForm({ ...form, cd_matricula: e.target.value })} />
          </div>
          <div>
            <Label>Colaborador</Label>
            <Input value={form.ds_colaborador} onChange={(e) => setForm({ ...form, ds_colaborador: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={mut.isPending}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.ds_titulo}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
