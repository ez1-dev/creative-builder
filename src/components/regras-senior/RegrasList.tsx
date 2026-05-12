import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTableBI, Column } from '@/components/bi/tables/DataTableBI';
import { Plus, RotateCw, MoreHorizontal, Eye, Pencil, FileDown, CheckCircle2, GitBranch, History, Copy, Power, FileCheck2, BookOpen, Code2, Upload } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP, StatusRegra } from '@/lib/senior/types';
import { StatusRegraBadge, STATUS_REGRA_OPTS } from './StatusRegraBadge';
import { PageHeader } from '@/components/erp/PageHeader';
import { toast } from 'sonner';
import { AlterarStatusRegraDialog } from './AlterarStatusRegraDialog';
import { AlterarSituacaoDialog } from './AlterarSituacaoDialog';
import { AlterarRegraDialog } from './AlterarRegraDialog';
import { ClonarParaPortalDialog } from './ClonarParaPortalDialog';
import { VerVersoesDialog } from './VerVersoesDialog';
import { VerCodigoLspDialog } from './VerCodigoLspDialog';
import { ImportarLoteRegrasDialog } from './ImportarLoteRegrasDialog';

function OrigemBadge({ value }: { value?: string | null }) {
  if (value === 'PORTAL') {
    return <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent">Portal</Badge>;
  }
  // default E098REG / ERP
  return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ERP Senior</Badge>;
}

const STATUS_OPTS: { value: StatusRegra | ''; label: string }[] = [
  { value: '', label: 'Todos status' },
  ...STATUS_REGRA_OPTS,
];

export function RegrasList() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [statusF, setStatusF] = useState<StatusRegra | ''>('');
  const [idereg, setIdereg] = useState('');
  const [data, setData] = useState<RegraLSP[]>([]);
  const [loading, setLoading] = useState(false);
  const [alterar, setAlterar] = useState<RegraLSP | null>(null);
  const [alterarSit, setAlterarSit] = useState<RegraLSP | null>(null);
  const [alterarReg, setAlterarReg] = useState<RegraLSP | null>(null);
  const [clonar, setClonar] = useState<RegraLSP | null>(null);
  const [verVersoes, setVerVersoes] = useState<RegraLSP | null>(null);
  const [verCodigo, setVerCodigo] = useState<RegraLSP | null>(null);
  const [openLote, setOpenLote] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const rows = await seniorApi.listarRegras({ texto, status_regra: statusF || undefined, idereg: idereg || undefined });
      setData(rows ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao listar regras');
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); /* initial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportarTxt = (r: RegraLSP) => {
    try {
      const url = seniorApi.exportarRegraTxtUrl(r.id);
      window.open(url, '_blank');
    } catch {
      // fallback client-side
      const blob = new Blob([r.fonte_lsp ?? ''], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `regra-${r.id}-${r.nome_regra}.txt`;
      a.click();
    }
  };

  const columns: Column<RegraLSP>[] = useMemo(() => [
    { key: 'id_regra', header: 'ID', sortable: true, render: (v) => v ?? '—' },
    { key: 'origem', header: 'Origem', render: (v) => <OrigemBadge value={v as string} /> },
    { key: 'codemp', header: 'Empresa', align: 'right', sortable: true, render: (v) => v ?? '—' },
    { key: 'nome_regra', header: 'Nome', sortable: true },
    { key: 'codreg_erp', header: 'Código Regra', sortable: true },
    { key: 'modsis', header: 'Módulo' },
    { key: 'idereg', header: 'Identificador' },
    { key: 'codtns', header: 'Transação' },
    { key: 'descricao', header: 'Descrição' },
    { key: 'status_regra', header: 'Status', render: (v) => <StatusRegraBadge value={v} /> },
    {
      key: 'fonte_lsp', header: 'Fonte LSP',
      render: (_v, r) => {
        if (r.origem === 'E098REG') {
          return <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30">Fonte não importado</Badge>;
        }
        return r.fonte_lsp
          ? <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent">Fonte disponível</Badge>
          : <Badge variant="outline" className="bg-muted text-muted-foreground">Sem fonte</Badge>;
      },
    },
    { key: 'ambiente', header: 'Ambiente' },
    { key: 'ticket', header: 'Ticket' },
    { key: 'criado_por', header: 'Criado por' },
    {
      key: 'criado_em', header: 'Data',
      render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '—',
    },
    {
      key: '__acoes', header: 'Ações',
      render: (_v, r) => {
        const isErp = r.origem === 'E098REG';
        const semIdPortal = r.id_regra == null;
        const idQs = new URLSearchParams();
        if (r.codemp != null) idQs.set('codemp', String(r.codemp));
        if (r.modsis) idQs.set('modsis', r.modsis);
        if (r.idereg) idQs.set('idereg', r.idereg);

        const validar = async () => {
          if (r.id_regra == null) return;
          const res = await seniorApi.validarRegra(r.id_regra);
          const avisos = res?.avisos ?? [];
          if (avisos.length === 0) toast.success('Regra válida.');
          else toast.message('Validação concluída', { description: avisos.map(a => `[${a.nivel}] ${a.mensagem}`).join('\n') });
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isErp ? (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">ERP Senior</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={semIdPortal}
                    onClick={() => navigate(`/regras-senior/regras/${r.id_regra}`)}>
                    <Eye className="mr-2 h-4 w-4" />Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (r.id_regra != null) navigate(`/regras-senior/regras/${r.id_regra}/negocio`, { state: { regra: r } });
                      else {
                        const qs = new URLSearchParams();
                        if (r.codemp != null) qs.set('codemp', String(r.codemp));
                        if (r.modsis) qs.set('modsis', r.modsis);
                        if (r.idereg) qs.set('idereg', r.idereg);
                        if (r.codtns) qs.set('codtns', r.codtns);
                        if (r.codreg_erp != null) qs.set('codreg', String(r.codreg_erp));
                        navigate(`/regras-senior/regras/erp/negocio?${qs.toString()}`, { state: { regra: r } });
                      }
                    }}>
                    <BookOpen className="mr-2 h-4 w-4" />Regra de negócio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setVerCodigo(r)}>
                    <Code2 className="mr-2 h-4 w-4" />Ver código LSP
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAlterarSit(r)}>
                    <Power className="mr-2 h-4 w-4" />Alterar situação
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAlterarReg(r)}>
                    <GitBranch className="mr-2 h-4 w-4" />Alterar regra vinculada
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={semIdPortal}
                    onClick={() => navigate(`/regras-senior/regras/${r.id_regra}/editor`)}>
                    <Pencil className="mr-2 h-4 w-4" />Abrir editor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClonar(r)}>
                    <Copy className="mr-2 h-4 w-4" />Clonar para portal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/regras-senior/auditoria?${idQs.toString()}`)}>
                    <History className="mr-2 h-4 w-4" />Ver auditoria
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="text-xs">
                    Fonte LSP não disponível no portal
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Portal</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={semIdPortal}
                    onClick={() => navigate(`/regras-senior/regras/${r.id_regra}`)}>
                    <Eye className="mr-2 h-4 w-4" />Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={semIdPortal}
                    onClick={() => navigate(`/regras-senior/regras/${r.id_regra}/negocio`, { state: { regra: r } })}>
                    <BookOpen className="mr-2 h-4 w-4" />Regra de negócio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setVerCodigo(r)}>
                    <Code2 className="mr-2 h-4 w-4" />Ver código LSP
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={semIdPortal}
                    onClick={() => navigate(`/regras-senior/regras/${r.id_regra}/editor`)}>
                    <Pencil className="mr-2 h-4 w-4" />Editar fonte LSP
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={semIdPortal} onClick={validar}>
                    <FileCheck2 className="mr-2 h-4 w-4" />Validar
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={semIdPortal} onClick={() => exportarTxt(r)}>
                    <FileDown className="mr-2 h-4 w-4" />Exportar TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={semIdPortal} onClick={() => setAlterar(r)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Alterar status
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={semIdPortal} onClick={() => setVerVersoes(r)}>
                    <History className="mr-2 h-4 w-4" />Ver versões
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [navigate]);

  return (
    <div className="space-y-3">
      <PageHeader
        title="Regras LSP"
        description="Listagem e gestão de regras do ERP Senior."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={carregar}><RotateCw className="mr-1 h-4 w-4" />Atualizar</Button>
            <Button size="sm" onClick={() => navigate('/regras-senior/regras/nova')}><Plus className="mr-1 h-4 w-4" />Nova regra</Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="text-xs text-muted-foreground">Busca</label>
              <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nome, código, descrição…" />
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={statusF || 'all'} onValueChange={(v) => setStatusF(v === 'all' ? '' : (v as StatusRegra))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => (
                    <SelectItem key={o.value || 'all'} value={o.value || 'all'}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground">Identificador</label>
              <Input value={idereg} onChange={(e) => setIdereg(e.target.value)} placeholder="IDEREG" />
            </div>
            <Button size="sm" onClick={carregar}>Filtrar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setTexto(''); setStatusF(''); setIdereg(''); }}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      <DataTableBI<RegraLSP>
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="Nenhuma regra encontrada. Cadastre uma regra no portal ou verifique se existem identificadores com regra vinculada na E098REG."
        enableSearch={false}
      />

      {alterar && (
        <AlterarStatusRegraDialog
          regra={alterar}
          onClose={() => setAlterar(null)}
          onDone={() => { setAlterar(null); carregar(); }}
        />
      )}
      {alterarSit && alterarSit.codemp != null && alterarSit.modsis && alterarSit.idereg && (
        <AlterarSituacaoDialog
          ident={{
            codemp: alterarSit.codemp,
            modsis: alterarSit.modsis,
            idereg: alterarSit.idereg,
            codtns: alterarSit.codtns ?? '',
            situacao: 'A',
            codreg: alterarSit.codreg_erp ?? null,
          }}
          onClose={() => setAlterarSit(null)}
          onDone={() => { setAlterarSit(null); carregar(); }}
        />
      )}
      {alterarReg && alterarReg.codemp != null && alterarReg.modsis && alterarReg.idereg && (
        <AlterarRegraDialog
          ident={{
            codemp: alterarReg.codemp,
            modsis: alterarReg.modsis,
            idereg: alterarReg.idereg,
            codtns: alterarReg.codtns ?? '',
            codreg: alterarReg.codreg_erp ?? null,
          }}
          onClose={() => setAlterarReg(null)}
          onDone={() => { setAlterarReg(null); carregar(); }}
        />
      )}
      {clonar && (
        <ClonarParaPortalDialog
          regra={clonar}
          onClose={() => setClonar(null)}
          onDone={() => carregar()}
        />
      )}
      {verVersoes && verVersoes.id_regra != null && (
        <VerVersoesDialog regraId={verVersoes.id_regra} onClose={() => setVerVersoes(null)} />
      )}
      {verCodigo && (
        <VerCodigoLspDialog
          regra={verCodigo}
          onClose={() => setVerCodigo(null)}
          onAfterClonar={() => { setVerCodigo(null); carregar(); }}
        />
      )}
    </div>
  );
}
