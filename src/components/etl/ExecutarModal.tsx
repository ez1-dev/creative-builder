import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Info, Play } from 'lucide-react';
import { executarTarefa, executarAcao, type ExecucaoParams } from '@/lib/etl/api';
import { api } from '@/lib/api';
import {
  extrairPlaceholders,
  validarValores,
  PLACEHOLDER_SPECS,
  PLACEHOLDERS_SUPORTADOS,
} from '@/lib/etl/placeholders';

interface ExecutarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alvo:
    | { tipo: 'tarefa'; nome: string; sqlTemplate?: string | null }
    | { tipo: 'acao'; idAcao: string; nomeTarefa?: string; sqlTemplate?: string | null }
    | null;
  onExecutado?: (resp: { execucao_id: string; anomes_ini: number; anomes_fim: number }) => void;
}

const anomesAtual = () => {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
};
const isoHoje = () => new Date().toISOString().slice(0, 10);

const valorInicial = (nome: string): string => {
  const spec = PLACEHOLDER_SPECS[nome];
  if (!spec) return '';
  if (spec.tipo === 'anomes') return String(anomesAtual());
  if (spec.tipo === 'data') return isoHoje();
  if (spec.tipo === 'inteiro') return '1';
  if (spec.tipo === 'inteiro_list') return '1';
  return '';
};

export function ExecutarModal({ open, onOpenChange, alvo, onExecutado }: ExecutarModalProps) {
  const [anomesIni, setAnomesIni] = useState<number>(anomesAtual());
  const [anomesFim, setAnomesFim] = useState<number>(anomesAtual());
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const placeholdersDetectados = useMemo(() => {
    const sql = alvo?.sqlTemplate ?? '';
    return extrairPlaceholders(sql).filter((p) => PLACEHOLDERS_SUPORTADOS.includes(p));
  }, [alvo]);

  // Placeholders extras = detectados que não são ANOMES_*
  const extrasNecessarios = useMemo(
    () => placeholdersDetectados.filter((p) => p !== 'ANOMES_INI' && p !== 'ANOMES_FIM'),
    [placeholdersDetectados],
  );

  useEffect(() => {
    if (open) {
      setExtras((prev) => {
        const next: Record<string, string> = {};
        for (const p of extrasNecessarios) next[p] = prev[p] ?? valorInicial(p);
        return next;
      });
    }
  }, [open, extrasNecessarios.join('|')]);

  const titulo = !alvo
    ? 'Executar'
    : alvo.tipo === 'tarefa'
    ? `Executar tarefa: ${alvo.nome}`
    : `Executar ação: ${alvo.idAcao}`;

  const handleConfirmar = async () => {
    if (!alvo) return;
    if (!anomesIni || !anomesFim) {
      toast.error('Informe anomes_ini e anomes_fim');
      return;
    }
    if (anomesFim < anomesIni) {
      toast.error('anomes_fim deve ser maior ou igual a anomes_ini');
      return;
    }

    // Valida extras contra os specs.
    if (extrasNecessarios.length > 0) {
      const v = validarValores(
        alvo.sqlTemplate ?? '',
        { ...extras, ANOMES_INI: anomesIni, ANOMES_FIM: anomesFim },
      );
      if (!v.ok) {
        toast.error(v.erros.join(' • '));
        return;
      }
    }

    setLoading(true);
    try {
      const parametros: Record<string, string | number> = {
        anomes_ini: Number(anomesIni),
        anomes_fim: Number(anomesFim),
      };
      for (const p of extrasNecessarios) {
        const spec = PLACEHOLDER_SPECS[p];
        const raw = extras[p];
        parametros[String(p ?? '').toLowerCase()] =
          spec?.tipo === 'anomes' || spec?.tipo === 'inteiro' ? Number(raw) : raw;
      }

      const payload: ExecucaoParams = {
        anomes_ini: Number(anomesIni),
        anomes_fim: Number(anomesFim),
        acionado_por: api.getUser() ?? 'MANUAL',
        parametros,
      };
      const resp =
        alvo.tipo === 'tarefa'
          ? await executarTarefa(alvo.nome, payload)
          : await executarAcao(alvo.idAcao, payload);
      toast.success(`Execução iniciada: ${resp.execucao_id ?? resp.status}`);
      onExecutado?.({ ...resp, anomes_ini: Number(anomesIni), anomes_fim: Number(anomesFim) });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao executar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>anomes_ini</Label>
            <Input
              type="number"
              value={anomesIni}
              onChange={(e) => setAnomesIni(Number(e.target.value))}
              placeholder="202601"
            />
          </div>
          <div>
            <Label>anomes_fim</Label>
            <Input
              type="number"
              value={anomesFim}
              onChange={(e) => setAnomesFim(Number(e.target.value))}
              placeholder="202601"
            />
          </div>
        </div>

        {extrasNecessarios.length > 0 && (
          <>
            <Alert className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Placeholders extras detectados no SQL — preencha todos antes de executar.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-3">
              {extrasNecessarios.map((p) => {
                const spec = PLACEHOLDER_SPECS[p];
                return (
                  <div key={p}>
                    <Label className="font-mono text-xs">$[{p}]</Label>
                    <Input
                      type={spec.inputType}
                      value={extras[p] ?? ''}
                      onChange={(e) => setExtras((s) => ({ ...s, [p]: e.target.value }))}
                      placeholder={spec.exemplo}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Formato AAAAMM (6 dígitos). No SQL, use placeholders <code className="font-mono">$[NOME]</code> —
          a FastAPI valida o tipo e faz o replace antes de executar no ERP.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={loading}>
            <Play className="h-4 w-4 mr-1" />
            {loading ? 'Executando…' : 'Confirmar execução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
