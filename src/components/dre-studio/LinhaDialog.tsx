import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { LinhaModelo, NaturezaLinha, Operador, PlanoContaItem, TipoLinha, TipoModelo } from "@/types/contabil";
import { normalizarItem, proximaOrdem, type EstruturaPadraoItem } from "@/lib/estruturasPadrao";
import { useEstruturaPadrao, usePlanoContas } from "@/hooks/contabil/api";
import { CODEMP } from "@/lib/contabilConfig";

export type TipoOrigemLinha = "ESTRUTURA_PADRAO" | "CONTA_CONTABIL" | "PERSONALIZADO";

export interface ContaVinculoSugerida {
  codemp: number;
  ctared: number;
  clacta: string;
  descta: string;
  nivcta: number;
  anasin: "A" | "S";
  incluir_subcontas: boolean;
  sinal: 1 | -1;
}

function sugerirNaturezaSinal(c: PlanoContaItem): { natureza: NaturezaLinha; sinal: 1 | -1 } {
  const desc = (c.descta || "").toLowerCase();
  const grupo = (c.grupo_contabil || "").toUpperCase();
  let natureza: NaturezaLinha = "OUTROS";
  if (grupo === "RESULTADO" && /receita|venda|faturamento/.test(desc)) natureza = "RECEITA";
  else if (/imposto|deduç|deduc|devolu|abatimento/.test(desc)) natureza = "DEDUCAO";
  else if (/custo|cpv|cmv/.test(desc)) natureza = "CUSTO";
  else if (/despesa/.test(desc)) natureza = "DESPESA";
  const sinal: 1 | -1 = natureza === "DEDUCAO" || natureza === "CUSTO" || natureza === "DESPESA" ? -1 : 1;
  return { natureza, sinal };
}

const tipos: TipoLinha[] = ["GRUPO", "ANALITICA", "SUBTOTAL", "TOTAL", "FORMULA"];
const naturezas: NaturezaLinha[] = [
  "RECEITA", "DEDUCAO", "CUSTO", "DESPESA", "RESULTADO",
  "ATIVO", "PASSIVO", "PATRIMONIO", "OUTROS",
];
const operadores: { value: Operador; label: string }[] = [
  { value: "SOMA", label: "Soma (+)" },
  { value: "SUBTRAI", label: "Subtrai (−)" },
];

export interface LinhaDraft {
  id?: string;
  linha_pai_id: string | null;
  ordem: number;
  codigo: string;
  descricao: string;
  tipo_linha: TipoLinha;
  natureza: NaturezaLinha;
  operador: Operador;
  sinal: 1 | -1;
  exibir: boolean;
  negrito: boolean;
  formula?: string | null;
}

export function LinhaDialog({
  open,
  onOpenChange,
  initial,
  parents,
  tipoModelo,
  linhasExistentes,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Partial<LinhaModelo> & { id?: string };
  parents: LinhaModelo[];
  tipoModelo: TipoModelo;
  linhasExistentes: LinhaModelo[];
  onSubmit: (data: LinhaDraft, extras?: { tipoOrigem: TipoOrigemLinha; conta?: ContaVinculoSugerida }) => void;
  isSubmitting?: boolean;
}) {
  const isEdit = !!initial.id;
  const { data: estruturaRaw, isLoading: estruturaLoading } = useEstruturaPadrao(tipoModelo);
  const estrutura = useMemo<EstruturaPadraoItem[]>(
    () => (estruturaRaw ?? []).map(normalizarItem),
    [estruturaRaw],
  );
  const { data: planoContasResp, isLoading: contasLoading } = usePlanoContas(tipoModelo, {
    somente_ativas: true,
    somente_analiticas: true,
  });
  const contasErp = planoContasResp?.dados ?? [];

  const [tipoOrigem, setTipoOrigem] = useState<TipoOrigemLinha>(
    isEdit ? "PERSONALIZADO" : "ESTRUTURA_PADRAO",
  );
  const [contaSelecionada, setContaSelecionada] = useState<PlanoContaItem | null>(null);


  const [modoCodigo, setModoCodigo] = useState<"padrao" | "personalizado">(
    isEdit ? "personalizado" : "padrao",
  );
  const [comboOpen, setComboOpen] = useState(false);

  const [data, setData] = useState<LinhaDraft>({
    linha_pai_id: initial.linha_pai_id ?? null,
    ordem: initial.ordem ?? proximaOrdem(linhasExistentes.map((l) => l.ordem)),
    codigo: initial.codigo ?? "",
    descricao: initial.descricao ?? "",
    tipo_linha: (initial.tipo_linha ?? "ANALITICA") as TipoLinha,
    natureza: (initial.natureza ?? "RECEITA") as NaturezaLinha,
    operador: (initial.operador ?? "SOMA") as Operador,
    sinal: (initial.sinal ?? 1) as 1 | -1,
    exibir: initial.exibir ?? true,
    negrito: initial.negrito ?? false,
    formula: initial.formula ?? null,
  });

  useEffect(() => {
    if (open) {
      setModoCodigo(initial.id ? "personalizado" : "padrao");
      setTipoOrigem(initial.id ? "PERSONALIZADO" : "ESTRUTURA_PADRAO");
      setContaSelecionada(null);
      setData({
        linha_pai_id: initial.linha_pai_id ?? null,
        ordem: initial.ordem ?? proximaOrdem(linhasExistentes.map((l) => l.ordem)),
        codigo: initial.codigo ?? "",
        descricao: initial.descricao ?? "",
        tipo_linha: (initial.tipo_linha ?? "ANALITICA") as TipoLinha,
        natureza: (initial.natureza ?? "RECEITA") as NaturezaLinha,
        operador: (initial.operador ?? "SOMA") as Operador,
        sinal: (initial.sinal ?? 1) as 1 | -1,
        exibir: initial.exibir ?? true,
        negrito: initial.negrito ?? false,
        formula: initial.formula ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const codigosUsados = useMemo(
    () => new Set(linhasExistentes.filter((l) => l.id !== initial.id).map((l) => l.codigo)),
    [linhasExistentes, initial.id],
  );
  const duplicado = data.codigo.trim() !== "" && codigosUsados.has(data.codigo.trim());

  const handleSelectPadrao = (codigo: string) => {
    const item = estrutura.find((e) => e.codigo === codigo);
    if (!item) return;
    setTipoOrigem("ESTRUTURA_PADRAO");
    setContaSelecionada(null);
    setData((d) => ({
      ...d,
      codigo: item.codigo,
      descricao: item.descricao,
      tipo_linha: item.tipo_linha,
      natureza: item.natureza,
      operador: item.operador,
      sinal: item.sinal,
      negrito: item.negrito,
      exibir: item.exibir,
      ordem: item.ordem_sugerida ?? proximaOrdem(linhasExistentes.map((l) => l.ordem)),
    }));
    setComboOpen(false);
  };

  const contaJaUsada = (c: PlanoContaItem) => codigosUsados.has(String(c.ctared));

  const handleSelectConta = (c: PlanoContaItem) => {
    if (contaJaUsada(c)) return;
    const { natureza, sinal } = sugerirNaturezaSinal(c);
    setTipoOrigem("CONTA_CONTABIL");
    setContaSelecionada(c);
    setData((d) => ({
      ...d,
      codigo: String(c.ctared),
      descricao: c.descta,
      tipo_linha: "ANALITICA",
      natureza,
      operador: "SOMA",
      sinal,
      exibir: true,
      negrito: false,
      ordem: d.ordem || proximaOrdem(linhasExistentes.map((l) => l.ordem)),
    }));
    setComboOpen(false);
  };

  const selectedLabel = data.codigo
    ? `${data.codigo} — ${data.descricao}`
    : "Selecione um código...";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Linha" : "Nova Linha"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Pai</Label>
            <Select
              value={data.linha_pai_id ?? "__none"}
              onValueChange={(v) => setData({ ...data, linha_pai_id: v === "__none" ? null : v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Raiz —</SelectItem>
                {parents.filter((p) => p.id !== initial.id).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codigo} — {p.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Código</Label>
            {modoCodigo === "padrao" ? (
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className={cn(!data.codigo && "text-muted-foreground")}>
                      {selectedLabel}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command
                    filter={(value, search) =>
                      value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }
                  >
                    <CommandInput placeholder="Buscar código ou descrição..." />
                    <CommandList>
                      <CommandEmpty>
                        {estruturaLoading
                          ? "Carregando estrutura…"
                          : estrutura.length === 0
                            ? `Nenhum item disponível para ${tipoModelo}.`
                            : "Nenhum resultado."}
                      </CommandEmpty>
                      <CommandGroup heading={`Estrutura padrão — ${tipoModelo}`}>
                        {estrutura.map((item) => {
                          const jaExiste = codigosUsados.has(item.codigo);
                          return (
                            <CommandItem
                              key={item.codigo}
                              value={`${item.codigo} ${item.descricao}`}
                              disabled={jaExiste}
                              onSelect={() => !jaExiste && handleSelectPadrao(item.codigo)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  data.codigo === item.codigo ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="font-mono text-xs mr-2 w-14 shrink-0">{item.codigo}</span>
                              <span className="flex-1 truncate">{item.descricao}</span>
                              {jaExiste && (
                                <Badge variant="outline" className="ml-2 h-4 text-[10px]">já existe</Badge>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup heading="Contas contábeis do ERP">
                        {contasLoading && (
                          <div className="px-2 py-1.5 text-xs text-slate-500">Carregando contas…</div>
                        )}
                        {!contasLoading && contasErp.length === 0 && (
                          <div className="px-2 py-1.5 text-xs text-slate-500">Nenhuma conta analítica disponível.</div>
                        )}
                        {contasErp.map((c) => {
                          const jaExiste = contaJaUsada(c);
                          const label = `${c.ctared} - ${c.clacta} - ${c.descta}`;
                          return (
                            <CommandItem
                              key={`erp-${c.ctared}-${c.clacta}`}
                              value={label}
                              disabled={jaExiste}
                              onSelect={() => handleSelectConta(c)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  contaSelecionada?.ctared === c.ctared ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="font-mono text-xs mr-2 w-16 shrink-0">{c.ctared}</span>
                              <span className="font-mono text-xs mr-2 w-24 shrink-0 text-slate-500">{c.clacta}</span>
                              <span className="flex-1 truncate">{c.descta}</span>
                              {jaExiste && (
                                <Badge variant="outline" className="ml-2 h-4 text-[10px]">já existe</Badge>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          value="__personalizado__"
                          onSelect={() => {
                            setModoCodigo("personalizado");
                            setTipoOrigem("PERSONALIZADO");
                            setContaSelecionada(null);
                            setComboOpen(false);
                            setData((d) => ({
                              ...d,
                              codigo: "",
                              descricao: "",
                              ordem: proximaOrdem(linhasExistentes.map((l) => l.ordem)),
                            }));
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Código personalizado
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={data.codigo}
                  onChange={(e) => {
                    setTipoOrigem("PERSONALIZADO");
                    setContaSelecionada(null);
                    setData({ ...data, codigo: e.target.value });
                  }}
                  placeholder="Ex.: 4.1"
                />
                {!isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setModoCodigo("padrao")}
                  >
                    Usar padrão
                  </Button>
                )}
              </div>
            )}
            {duplicado && (
              <p className="text-xs text-red-600 mt-1">Este código já existe neste modelo.</p>
            )}
          </div>

          <div>
            <Label>Ordem</Label>
            <Input
              type="number"
              value={data.ordem}
              onChange={(e) => setData({ ...data, ordem: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Sinal</Label>
            <Select
              value={String(data.sinal)}
              onValueChange={(v) => setData({ ...data, sinal: (Number(v) as 1 | -1) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">+ (positivo)</SelectItem>
                <SelectItem value="-1">− (negativo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Descrição</Label>
            <Input
              value={data.descricao}
              onChange={(e) => setData({ ...data, descricao: e.target.value })}
              disabled={modoCodigo === "padrao" && !!data.codigo}
            />
          </div>
          <div>
            <Label>Tipo de Linha</Label>
            <Select value={data.tipo_linha} onValueChange={(v) => setData({ ...data, tipo_linha: v as TipoLinha })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Natureza</Label>
            <Select value={data.natureza} onValueChange={(v) => setData({ ...data, natureza: v as NaturezaLinha })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {naturezas.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Operador</Label>
            <Select
              value={data.operador === "SOMA" ? "SOMA" : "SUBTRAI"}
              onValueChange={(v) => setData({ ...data, operador: v as Operador })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {operadores.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {data.tipo_linha === "FORMULA" && (
            <div className="col-span-2">
              <Label>Fórmula</Label>
              <Textarea
                value={data.formula ?? ""}
                onChange={(e) => setData({ ...data, formula: e.target.value })}
                placeholder="Ex: L1 + L2 - L3"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={data.exibir} onCheckedChange={(v) => setData({ ...data, exibir: v })} />
            <Label>Exibir</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={data.negrito} onCheckedChange={(v) => setData({ ...data, negrito: v })} />
            <Label>Negrito</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!data.codigo || !data.descricao || duplicado || isSubmitting}
            onClick={() => {
              const extras = tipoOrigem === "CONTA_CONTABIL" && contaSelecionada
                ? {
                    tipoOrigem,
                    conta: {
                      codemp: CODEMP,
                      ctared: contaSelecionada.ctared,
                      clacta: contaSelecionada.clacta,
                      descta: contaSelecionada.descta,
                      nivcta: contaSelecionada.nivcta,
                      anasin: contaSelecionada.anasin,
                      incluir_subcontas: false,
                      sinal: data.sinal,
                    } as ContaVinculoSugerida,
                  }
                : { tipoOrigem };
              onSubmit(data, extras);
            }}
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
