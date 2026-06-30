import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sincronizarRh } from "@/lib/rh/api";
import { RefreshCw, Loader2 } from "lucide-react";

function monthToAnomes(v: string) {
  // "2026-01" → "202601"
  return v ? v.replace("-", "") : "";
}
function defaultMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function SincronizarRhDialog({ variant = "outline" }: { variant?: "outline" | "default" | "secondary" }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [ini, setIni] = useState(defaultMonth(-5));
  const [fim, setFim] = useState(defaultMonth(0));
  const [codemp, setCodemp] = useState("1");
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    const anomes_ini = monthToAnomes(ini);
    const anomes_fim = monthToAnomes(fim);
    if (!anomes_ini || !anomes_fim) {
      toast({ title: "Informe o período", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await sincronizarRh({ anomes_ini, anomes_fim, codemp: Number(codemp) || 1 });
      toast({ title: "Sincronização RH concluída", description: `${anomes_ini} → ${anomes_fim}` });
      qc.invalidateQueries({ queryKey: ["rh"] });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Falha na sincronização", description: e?.message ?? "Erro desconhecido", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sincronizar RH
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sincronizar RH</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mês inicial</Label>
            <Input type="month" value={ini} onChange={(e) => setIni(e.target.value)} />
          </div>
          <div>
            <Label>Mês final</Label>
            <Input type="month" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Código da empresa</Label>
            <Input value={codemp} onChange={(e) => setCodemp(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSync} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Executar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
