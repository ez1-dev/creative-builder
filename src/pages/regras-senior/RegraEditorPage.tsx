import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, FileCheck2, FileDown, Copy, AlertTriangle } from 'lucide-react';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP } from '@/lib/senior/types';
import { StatusRegraBadge } from '@/components/regras-senior/StatusRegraBadge';
import { ClonarParaPortalDialog } from '@/components/regras-senior/ClonarParaPortalDialog';
import { PageHeader } from '@/components/erp/PageHeader';

function OrigemBadge({ value }: { value?: string | null }) {
  if (value === 'PORTAL') {
    return <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent">Portal</Badge>;
  }
  return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ERP Senior</Badge>;
}

function LineNumberedTextarea({
  value, onChange, disabled, minHeight = 600,
}: { value: string; onChange: (v: string) => void; disabled?: boolean; minHeight?: number }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => Math.max(1, value.split('\n').length), [value]);

  const onScroll = () => {
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  return (
    <div className="flex border rounded-md overflow-hidden bg-muted/10" style={{ minHeight }}>
      <div
        ref={gutterRef}
        className="select-none text-right py-2 px-2 text-xs font-mono text-muted-foreground bg-muted/40 border-r overflow-hidden"
        style={{ minWidth: 48 }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{ lineHeight: '1.5rem' }}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={onScroll}
        disabled={disabled}
        spellCheck={false}
        wrap="off"
        className="flex-1 p-2 text-xs font-mono bg-background outline-none resize-none whitespace-pre overflow-auto disabled:opacity-60"
        style={{ minHeight, lineHeight: '1.5rem' }}
      />
    </div>
  );
}

export default function RegraEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regra, setRegra] = useState<RegraLSP | null>(null);
  const [openClonar, setOpenClonar] = useState(false);

  // Campos editáveis
  const [nomeRegra, setNomeRegra] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ticket, setTicket] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fonteLsp, setFonteLsp] = useState('');

  const isErp = regra?.origem === 'E098REG';
  const isPortal = regra?.origem === 'PORTAL';

  const carregar = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await seniorApi.obterRegra(id);
      setRegra(r);
      setNomeRegra(r.nome_regra ?? '');
      setDescricao(r.descricao ?? '');
      setTicket(r.ticket ?? '');
      setMotivo(r.motivo ?? '');
      setFonteLsp(r.fonte_lsp ?? '');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível carregar a regra');
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [id]);

  const salvar = async () => {
    if (!regra || !isPortal) return;
    setSaving(true);
    try {
      await seniorApi.atualizarRegra(regra.id, {
        nome_regra: nomeRegra,
        codreg_erp: regra.codreg_erp ?? null,
        modsis: regra.modsis ?? null,
        idereg: regra.idereg ?? null,
        codtns: regra.codtns ?? '',
        descricao: descricao || null,
        ambiente: regra.ambiente ?? null,
        ticket: ticket || null,
        motivo: motivo || null,
        fonte_lsp: fonteLsp,
      } as Partial<RegraLSP>);
      toast.success('Regra salva.');
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const validar = async () => {
    if (!regra?.id_regra) return;
    try {
      const res = await seniorApi.validarRegra(regra.id_regra);
      const avisos = res?.avisos ?? [];
      if (avisos.length === 0) toast.success('Regra válida.');
      else toast.message('Validação concluída', { description: avisos.map(a => `[${a.nivel}] ${a.mensagem}`).join('\n') });
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao validar');
    }
  };

  const exportarTxt = () => {
    if (!regra?.id_regra) return;
    window.open(seniorApi.exportarRegraTxtUrl(regra.id_regra), '_blank');
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title={regra ? `Regra: ${regra.nome_regra}` : 'Editor de regra'}
        description="Edição do fonte LSP da regra."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" />Voltar
          </Button>
        }
      />

      {loading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {!loading && regra && (
        <>
          <Card>
            <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Origem</div>
                <OrigemBadge value={regra.origem} />
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <StatusRegraBadge value={regra.status_regra} />
              </div>
              <div>
                <div className="text-muted-foreground">Código ERP</div>
                <div className="font-medium">{regra.codreg_erp ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Empresa</div>
                <div className="font-medium">{regra.codemp ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Módulo</div>
                <div className="font-medium">{regra.modsis ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Identificador</div>
                <div className="font-medium">{regra.idereg ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Transação</div>
                <div className="font-medium">{regra.codtns ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Ambiente</div>
                <div className="font-medium">{regra.ambiente ?? '—'}</div>
              </div>
            </CardContent>
          </Card>

          {isErp && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">Fonte LSP ainda não importado para o portal.</div>
                  <div className="text-muted-foreground">
                    Este registro vem da E098REG e representa apenas o vínculo do identificador com o código da regra.
                    Para editar, clone-o para o portal.
                  </div>
                </div>
                <Button size="sm" onClick={() => setOpenClonar(true)}>
                  <Copy className="mr-1 h-4 w-4" />Clonar para Portal
                </Button>
              </CardContent>
            </Card>
          )}

          {isPortal && (
            <Card>
              <CardContent className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground">Nome da regra</label>
                  <Input value={nomeRegra} onChange={(e) => setNomeRegra(e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground">Descrição</label>
                  <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Ticket</label>
                  <Input value={ticket} onChange={(e) => setTicket(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Motivo</label>
                  <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Fonte LSP</label>
              {isErp && <span className="text-xs text-muted-foreground">Somente leitura — clone para editar</span>}
            </div>
            <LineNumberedTextarea
              value={fonteLsp}
              onChange={setFonteLsp}
              disabled={!isPortal}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={!isPortal || saving}>
              <Save className="mr-1 h-4 w-4" />{saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={validar} disabled={!regra.id_regra}>
              <FileCheck2 className="mr-1 h-4 w-4" />Validar
            </Button>
            <Button variant="outline" onClick={exportarTxt} disabled={!regra.id_regra}>
              <FileDown className="mr-1 h-4 w-4" />Exportar TXT
            </Button>
          </div>
        </>
      )}

      {openClonar && regra && (
        <ClonarParaPortalDialog
          regra={regra}
          onClose={() => setOpenClonar(false)}
        />
      )}
    </div>
  );
}
