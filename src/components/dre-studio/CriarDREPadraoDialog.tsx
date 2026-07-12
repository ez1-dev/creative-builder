import { useState } from "react";
import { Sparkles } from "lucide-react";
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
import { useCriarDREPadrao } from "@/hooks/contabil/useCriarDREPadrao";
import type { Modelo } from "@/types/contabil";

export function CriarDREPadraoDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (m: Modelo) => void;
}) {
  const [nome, setNome] = useState("DRE Padrão");
  const [descricao, setDescricao] = useState("");
  const criar = useCriarDREPadrao();

  return (
    <Dialog open={open} onOpenChange={(o) => !criar.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Criar DRE Padrão
          </DialogTitle>
          <DialogDescription>
            Cria um modelo de DRE com a estrutura padrão (Receitas, Deduções,
            Custos, Despesas, Resultados). Tudo continua editável depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: DRE Padrão"
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
            {criar.isPending ? "Criando..." : "Criar DRE Padrão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
