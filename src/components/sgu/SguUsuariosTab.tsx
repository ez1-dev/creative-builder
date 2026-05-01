import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Eye, ArrowRightFromLine, ArrowLeftToLine, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { useSgu } from './SguContext';
import { getResumoAcessos, getUsuario, getUsuarios, type SguUsuario, type ResumoAcessos } from '@/lib/sguApi';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

export function SguUsuariosTab() {
  const { setUsuarioOrigem, setUsuarioDestino, usuarioOrigem, usuarioDestino } = useSgu();
  const [filtro, setFiltro] = useState('');
  const [usuarios, setUsuarios] = useState<SguUsuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const [detalheOpen, setDetalheOpen] = useState(false);
  const [detalheUsr, setDetalheUsr] = useState<SguUsuario | null>(null);
  const [detalheResumo, setDetalheResumo] = useState<ResumoAcessos | null>(null);
  const [detalheLoading, setDetalheLoading] = useState(false);

  const handlePesquisar = async () => {
    setLoading(true);
    try {
      const data = await getUsuarios(filtro);
      setUsuarios(data);
      setPagina(1);
    } catch {
      // toast já disparado em sguApi
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = async (codusu: number) => {
    if (!Number.isFinite(Number(codusu))) {
      toast.error('Código de usuário inválido neste registro. O backend não retornou um codusu numérico.');
      return;
    }
    setDetalheOpen(true);
    setDetalheLoading(true);
    setDetalheUsr(null);
    setDetalheResumo(null);
    try {
      const [u, r] = await Promise.all([getUsuario(codusu), getResumoAcessos(codusu)]);
      setDetalheUsr(u);
      setDetalheResumo(r);
    } catch {
      // erro já tratado
    } finally {
      setDetalheLoading(false);
    }
  };

  const codusuValido = (u: SguUsuario) => Number.isFinite(Number(u.codusu));

  const totalPaginas = Math.max(1, Math.ceil(usuarios.length / PAGE_SIZE));
  const inicio = (pagina - 1) * PAGE_SIZE;
  const visiveis = usuarios.slice(inicio, inicio + PAGE_SIZE);

  const backendComBugCodusu = useMemo(
    () => usuarios.length > 0 && usuarios.every((u) => !codusuValido(u)),
    [usuarios],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesquisa de Usuários SGU</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Código ou nome do usuário"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePesquisar()}
                className="pl-8"
              />
            </div>
            <Button onClick={handlePesquisar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Pesquisar
            </Button>
          </div>
        </CardContent>
      </Card>

      {backendComBugCodusu && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Backend SGU retornando codusu incorreto</AlertTitle>
          <AlertDescription>
            O backend está enviando o login textual no campo <code>codusu</code>, quando o esperado é o
            código numérico (PK) do usuário SGU. Enquanto isso não for corrigido, as ações
            <strong> Detalhes</strong>, <strong>Origem</strong> e <strong>Destino</strong> ficam
            desabilitadas. Detalhes técnicos e SQL sugerido para o time de backend em
            <code> docs/backend-sgu-codusu-bug.md</code>.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Nome completo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>R910</TableHead>
                  <TableHead>R999</TableHead>
                  <TableHead className="text-right">Qtd E099USU</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Pesquise para listar usuários SGU.
                    </TableCell>
                  </TableRow>
                ) : (
                  visiveis.map((u, idx) => {
                    const semR910 = !u.existe_r910;
                    const semR999 = !u.existe_r999;
                    const semE099 = (u.qtd_empresas_e099usu ?? 0) === 0;
                    const codValido = codusuValido(u);
                    return (
                      <TableRow key={codValido ? `cod-${u.codusu}` : `idx-${idx}`}>
                        <TableCell className="font-mono">
                          {codValido ? (
                            u.codusu
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
                                  <AlertTriangle className="h-3 w-3 text-destructive" />
                                  <span className="text-xs">aguardando</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Backend retornou codusu não numérico. Aguardando correção (ver docs/backend-sgu-codusu-bug.md).
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{u.nomusu || '—'}</TableCell>
                        <TableCell>{u.nomcom || u.desusu || '—'}</TableCell>
                        <TableCell>{u.tipcol ?? '—'}</TableCell>
                        <TableCell>{u.empcol ?? '—'}</TableCell>
                        <TableCell>{u.filcol ?? '—'}</TableCell>
                        <TableCell>
                          {semR910 ? (
                            <Badge variant="destructive">Sem R910</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {semR999 ? (
                            <Badge variant="destructive">Sem R999</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <span>{u.qtd_empresas_e099usu ?? 0}</span>
                            {semE099 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Usuário sem parametrização no Gestão Empresarial
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!codValido}
                              onClick={() => handleVerDetalhes(u.codusu)}
                            >
                              <Eye className="h-3 w-3" /> Detalhes
                            </Button>
                            <Button
                              size="sm"
                              variant={usuarioOrigem?.codusu === u.codusu ? 'default' : 'outline'}
                              disabled={!codValido}
                              onClick={() => {
                                setUsuarioOrigem(u);
                                toast.success(`Origem: ${u.codusu} - ${u.nomusu}`);
                              }}
                            >
                              <ArrowRightFromLine className="h-3 w-3" /> Origem
                            </Button>
                            <Button
                              size="sm"
                              variant={usuarioDestino?.codusu === u.codusu ? 'default' : 'outline'}
                              disabled={!codValido}
                              onClick={() => {
                                setUsuarioDestino(u);
                                toast.success(`Destino: ${u.codusu} - ${u.nomusu}`);
                              }}
                            >
                              <ArrowLeftToLine className="h-3 w-3" /> Destino
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {usuarios.length > PAGE_SIZE && (
            <PaginationControl
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalRegistros={usuarios.length}
              onPageChange={setPagina}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={detalheOpen} onOpenChange={setDetalheOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do usuário</SheetTitle>
            <SheetDescription>Resumo de acessos e tabelas E099*</SheetDescription>
          </SheetHeader>
          {detalheLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detalheUsr ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Código</div>
                <div className="font-mono">{detalheUsr.codusu}</div>
                <div className="text-muted-foreground">Nome</div>
                <div className="font-medium">{detalheUsr.nomusu}</div>
                <div className="text-muted-foreground">Tipo</div>
                <div>{detalheUsr.tipcol ?? '—'}</div>
                <div className="text-muted-foreground">Empresa</div>
                <div>{detalheUsr.empcol ?? '—'}</div>
                <div className="text-muted-foreground">Filial</div>
                <div>{detalheUsr.filcol ?? '—'}</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Resumo de acessos</h4>
                {detalheResumo?.tabelas?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tabela</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalheResumo.tabelas.map((t) => (
                        <TableRow key={t.tabela}>
                          <TableCell className="font-mono">{t.tabela}</TableCell>
                          <TableCell className="text-right">{t.qtd}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem dados de resumo.</p>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
