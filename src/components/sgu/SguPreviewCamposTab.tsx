import { useMemo, useState } from 'react';
import { Eye, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/erp/KPICard';
import { useSgu } from './SguContext';
import { duplicarPreviewCampos, TABELAS_E099, type AcaoCampo } from '@/lib/sguApi';
import { cn } from '@/lib/utils';

const ACOES: AcaoCampo[] = ['ALTERAR', 'MANTER', 'INSERIR', 'IGNORAR', 'ERRO'];

function acaoBadgeClass(acao: AcaoCampo) {
  switch (acao) {
    case 'ALTERAR':
      return 'bg-warning text-warning-foreground hover:bg-warning/90';
    case 'INSERIR':
      return 'bg-primary text-primary-foreground hover:bg-primary/90';
    case 'MANTER':
    case 'IGNORAR':
      return 'bg-muted text-muted-foreground hover:bg-muted/80';
    case 'ERRO':
      return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
  }
}

function fmt(v: any) {
  if (v === null || v === undefined) return <span className="text-muted-foreground italic">null</span>;
  if (typeof v === 'object') return <code className="text-xs">{JSON.stringify(v)}</code>;
  return String(v);
}

export function SguPreviewCamposTab() {
  const {
    usuarioOrigem,
    usuarioDestino,
    preview,
    setPreview,
    mostrarCamposIguais,
    setMostrarCamposIguais,
  } = useSgu();
  const [loading, setLoading] = useState(false);

  const [fTabela, setFTabela] = useState<string>('all');
  const [fEmpresa, setFEmpresa] = useState<string>('all');
  const [fCampo, setFCampo] = useState<string>('');
  const [fAcao, setFAcao] = useState<string>('all');
  const [fBusca, setFBusca] = useState<string>('');

  const handleGerar = async () => {
    if (!usuarioOrigem || !usuarioDestino) return;
    setLoading(true);
    try {
      const r = await duplicarPreviewCampos({
        usuario_origem: usuarioOrigem.codusu,
        usuario_destino: usuarioDestino.codusu,
        tabelas: TABELAS_E099,
        mostrar_campos_iguais: mostrarCamposIguais,
      });
      setPreview(r);
    } catch {
      // tratado
    } finally {
      setLoading(false);
    }
  };

  const empresas = useMemo(() => {
    if (!preview) return [] as string[];
    const set = new Set<string>();
    preview.diferencas.forEach((d) => {
      if (d.empresa !== null && d.empresa !== undefined && d.empresa !== '') {
        set.add(String(d.empresa));
      }
    });
    return Array.from(set).sort();
  }, [preview]);

  const filtradas = useMemo(() => {
    if (!preview) return [];
    const busca = fBusca.trim().toLowerCase();
    return preview.diferencas.filter((d) => {
      if (fTabela !== 'all' && d.tabela !== fTabela) return false;
      if (fEmpresa !== 'all' && String(d.empresa ?? '') !== fEmpresa) return false;
      if (fAcao !== 'all' && d.acao !== fAcao) return false;
      if (fCampo && !d.campo.toLowerCase().includes(fCampo.toLowerCase())) return false;
      if (busca) {
        const blob = `${d.tabela} ${d.campo} ${d.empresa ?? ''} ${d.valor_origem ?? ''} ${d.valor_destino ?? ''} ${d.motivo ?? ''}`.toLowerCase();
        if (!blob.includes(busca)) return false;
      }
      return true;
    });
  }, [preview, fTabela, fEmpresa, fAcao, fCampo, fBusca]);

  const podeGerar = !!usuarioOrigem && !!usuarioDestino;

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Atenção</AlertTitle>
        <AlertDescription>
          A duplicação não altera senha, login, bloqueio, nome, cadastro base R910USU/R999USU nem históricos R999.
          Apenas parâmetros E099* serão considerados.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Button onClick={handleGerar} disabled={!podeGerar || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Gerar preview por campo
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={mostrarCamposIguais}
              onCheckedChange={(v) => setMostrarCamposIguais(!!v)}
            />
            Mostrar campos iguais
          </label>
          {!podeGerar && (
            <span className="text-xs text-muted-foreground">
              Selecione origem e destino na aba Usuários.
            </span>
          )}
        </CardContent>
      </Card>

      {preview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard title="Total de diferenças" value={preview.total_diferencas} variant="default" index={0} />
            <KPICard title="Alterações planejadas" value={preview.total_alterar} variant="warning" index={1} />
            <KPICard title="Campos preservados" value={preview.total_manter} variant="default" index={2} />
            <KPICard title="Registros a inserir" value={preview.total_inserir} variant="info" index={3} />
          </div>

          <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-2">
              <Select value={fTabela} onValueChange={setFTabela}>
                <SelectTrigger><SelectValue placeholder="Tabela" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  {TABELAS_E099.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fEmpresa} onValueChange={setFEmpresa}>
                <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Campo"
                value={fCampo}
                onChange={(e) => setFCampo(e.target.value)}
              />
              <Select value={fAcao} onValueChange={setFAcao}>
                <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {ACOES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar texto..."
                value={fBusca}
                onChange={(e) => setFBusca(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Valor origem</TableHead>
                      <TableHead>Valor destino</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          Nenhuma diferença para os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtradas.map((d, i) => (
                        <TableRow key={`${d.tabela}-${d.empresa}-${d.campo}-${i}`}>
                          <TableCell className="font-mono text-xs">{d.tabela}</TableCell>
                          <TableCell>{d.empresa ?? '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{d.campo}</TableCell>
                          <TableCell>{fmt(d.valor_origem)}</TableCell>
                          <TableCell>{fmt(d.valor_destino)}</TableCell>
                          <TableCell>
                            <Badge className={cn('border-transparent', acaoBadgeClass(d.acao))}>
                              {d.acao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.motivo ?? (d.tabela === 'E099USU' && d.acao === 'MANTER'
                              ? 'Campo preservado do usuário destino.'
                              : '—')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
