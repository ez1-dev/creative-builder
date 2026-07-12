import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CODEMP } from "@/lib/contabilConfig";
import type { Modelo, TipoModelo } from "@/types/contabil";

export type ModeloFormValue = {
  nome: string;
  tipo_modelo: TipoModelo;
  descricao: string;
  ativo: boolean;
};

export function ModeloForm({
  initial,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Modelo>;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (v: ModeloFormValue) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [tipo, setTipo] = useState<TipoModelo>(initial?.tipo_modelo ?? "DRE");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [ativo, setAtivo] = useState<boolean>(initial?.ativo ?? true);
  const tipoOriginal = initial?.tipo_modelo;

  useEffect(() => {
    setNome(initial?.nome ?? "");
    setTipo(initial?.tipo_modelo ?? "DRE");
    setDescricao(initial?.descricao ?? "");
    setAtivo(initial?.ativo ?? true);
  }, [initial?.id, initial?.nome, initial?.tipo_modelo, initial?.descricao, initial?.ativo]);

  const tipoChanged = tipoOriginal && tipoOriginal !== tipo;

  return (
    <div className="rounded-lg border bg-white p-6 space-y-5">
      <div className="grid gap-4">
        <div>
          <Label>Empresa</Label>
          <Input value={`codemp = ${CODEMP}`} disabled />
        </div>
        <div>
          <Label>Nome *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: DRE Gerencial" />
        </div>
        <div>
          <Label>Tipo do Modelo *</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoModelo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRE">DRE</SelectItem>
              <SelectItem value="BALANCO">Balanço Patrimonial</SelectItem>
            </SelectContent>
          </Select>
          {tipoChanged && (
            <p className="text-xs text-amber-600 mt-1">
              Alterar o tipo não converte linhas/contas já vinculadas — revise a estrutura depois de salvar.
            </p>
          )}
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={ativo} onCheckedChange={setAtivo} />
          <Label>Ativo</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} type="button">Cancelar</Button>
        )}
        <Button
          disabled={!nome.trim() || isSubmitting}
          onClick={() => onSubmit({ nome: nome.trim(), tipo_modelo: tipo, descricao, ativo })}
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
