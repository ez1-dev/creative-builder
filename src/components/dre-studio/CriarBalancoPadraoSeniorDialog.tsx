import { useState } from "react";
import { Landmark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCriarBalancoPadraoSenior } from "@/hooks/contabil/useCriarBalancoPadraoSenior";
import type { Modelo } from "@/types/contabil";

export function CriarBalancoPadraoSeniorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (m: Modelo) => void;
}) {
  const [nome, setNome] = useState("Balanço Padrão Senior");
  const [descricao, setDescricao] = useState("");
  const criar = useCriarBalancoPadraoSenior();

  return (
    <Dialog open={open} onOpenChange={(o) => !criar.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-600" /> Criar Balanço Padrão Senior
          </DialogTitle>
          <DialogDescription>
            O modelo será criado pela API a partir do plano de contas Senior
            (E045PLA), classes 1 e 2, nível máximo 4, somente contas ativas,
            modo RESUMIDO. As linhas e vínculos continuam 100% editáveis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Balanço Padrão Senior"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            disabled={criar.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={!nome.trim() || criar.isPending}
            onClick={async () => {
              const r = await criar.mutateAsync({
                nome: nome.trim(),
                descricao: descricao.trim() || undefined,
              });
              if (r.modelo?.id) {
                onCreated(r.modelo);
              }
            }}
          >
            {criar.isPending ? "Criando..." : "Criar Balanço Padrão Senior"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
