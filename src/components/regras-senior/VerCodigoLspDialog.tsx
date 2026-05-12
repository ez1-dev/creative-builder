import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Pencil, AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP } from '@/lib/senior/types';
import { ImportarFonteLspDialog } from './ImportarFonteLspDialog';
import { ClonarParaPortalDialog } from './ClonarParaPortalDialog';

type CodigoResp = {
  fonte_disponivel: boolean;
  fonte_lsp?: string;
  origem_fonte?: string;
  codreg?: string | number;
  modsis?: string;
  idereg?: string;
  codtns?: string;
  nome_regra?: string;
  hash?: string;
  id_regra?: number | string | null;
};

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value ?? '—'}</div>
    </div>
  );
}

export function VerCodigoLspDialog({
  regra, onClose, onAfterClonar,
}: {
  regra: RegraLSP;
  onClose: () => void;
  onAfterClonar?: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<CodigoResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [openImportar, setOpenImportar] = useState(false);
  const [openClonar, setOpenClonar] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await seniorApi.obterCodigoRegra({
        codreg: regra.codreg_erp ?? '',
        modsis: regra.modsis ?? '',
        idereg: regra.idereg ?? '',
        codtns: regra.codtns ?? undefined,
        codemp: regra.codemp ?? undefined,
      });
      setResp(r);
    } catch (e: any) {
      const status = Number(e?.statusCode ?? 0);
      const msg = String(e?.message ?? '');
      if (status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        onClose();
        navigate('/login');
        return;
      }
      if (status === 422 || msg.includes('int_parsing') || msg.toLowerCase().includes('id_regra')) {
        setErro(
          'Erro ao buscar código LSP. Verifique se o backend foi atualizado com as rotas fixas antes das rotas paramétricas ' +
          '(ex.: /regras/codigo precisa vir antes de /regras/{id_regra}).'
        );
      } else if (status === 404) {
        setErro('Fonte LSP não encontrado.');
      } else {
        setErro(msg || 'Erro ao obter código LSP.');
      }
      setResp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resp?.fonte_lsp ?? '');
      toast.success('Código copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const clonarOuEditar = () => {
    if (regra.origem === 'PORTAL' && regra.id_regra != null) {
      onClose();
      navigate(`/regras-senior/regras/${regra.id_regra}/editor`);
    } else {
      setOpenClonar(true);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Código LSP da Regra</DialogTitle>
            <DialogDescription>
              Visualização do fonte LSP vinculado a este identificador.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : erro ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Não foi possível carregar o código LSP</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{erro}</AlertDescription>
            </Alert>
          ) : resp?.fonte_disponivel ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Field label="Código da regra" value={resp.codreg ?? regra.codreg_erp} />
                <Field label="Módulo" value={resp.modsis ?? regra.modsis} />
                <Field label="Identificador" value={resp.idereg ?? regra.idereg} />
                <Field label="Transação" value={resp.codtns ?? regra.codtns} />
                <div>
                  <div className="text-[11px] uppercase text-muted-foreground">Origem da fonte</div>
                  <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent mt-1">
                    {resp.origem_fonte ?? 'PORTAL'}
                  </Badge>
                </div>
              </div>

              <pre className="font-mono text-xs bg-muted rounded-md p-3 max-h-[480px] overflow-auto whitespace-pre">
                {resp.fonte_lsp ?? ''}
              </pre>
            </div>
          ) : (
            <Alert variant="default" className="bg-warning/10 border-warning/30">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle>Fonte LSP ainda não importado</AlertTitle>
              <AlertDescription>
                Fonte LSP ainda não importado para o portal. Este registro vem da E098REG e representa apenas o vínculo do identificador com o código da regra.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            {!loading && erro && (
              <Button variant="outline" onClick={carregar}>
                <Loader2 className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            )}
            {!loading && !erro && resp?.fonte_disponivel && (
              <>
                <Button variant="outline" onClick={copiar}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar código
                </Button>
                <Button onClick={clonarOuEditar}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {regra.origem === 'PORTAL' ? 'Editar no portal' : 'Clonar/Editar no portal'}
                </Button>
              </>
            )}
            {!loading && !erro && resp && !resp.fonte_disponivel && (
              <Button onClick={() => setOpenImportar(true)}>
                <FileUp className="mr-2 h-4 w-4" /> Importar fonte LSP
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Voltar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {openImportar && (
        <ImportarFonteLspDialog
          regra={regra}
          onClose={() => setOpenImportar(false)}
          onImported={() => { setOpenImportar(false); carregar(); }}
        />
      )}
      {openClonar && (
        <ClonarParaPortalDialog
          regra={regra}
          onClose={() => setOpenClonar(false)}
          onDone={() => { setOpenClonar(false); onAfterClonar?.(); onClose(); }}
        />
      )}
    </>
  );
}
