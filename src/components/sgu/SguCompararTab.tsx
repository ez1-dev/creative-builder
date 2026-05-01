import { useState } from 'react';
import { GitCompare, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSgu } from './SguContext';
import { compararUsuarios } from '@/lib/sguApi';

function UsuarioCard({ titulo, usuario }: { titulo: string; usuario: any }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {usuario ? (
          <div className="space-y-1">
            <div className="font-mono text-xs text-muted-foreground">#{usuario.codusu}</div>
            <div className="font-semibold">{usuario.nomusu}</div>
            <div className="text-xs text-muted-foreground">
              {usuario.empcol ?? '—'} / {usuario.filcol ?? '—'}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecione na aba Usuários.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SguCompararTab() {
  const { usuarioOrigem, usuarioDestino, comparacao, setComparacao } = useSgu();
  const [loading, setLoading] = useState(false);

  const handleComparar = async () => {
    if (!usuarioOrigem || !usuarioDestino) return;
    setLoading(true);
    try {
      const r = await compararUsuarios(usuarioOrigem.codusu, usuarioDestino.codusu);
      setComparacao(r);
    } catch {
      // tratado
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (qo: number, qd: number) => {
    if (qo === qd) return <Badge variant="secondary">Quantidade igual</Badge>;
    if (qo > qd) return <Badge variant="destructive">Destino incompleto</Badge>;
    return (
      <Badge variant="outline" className="border-warning text-warning">
        Destino tem registros extras
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <UsuarioCard titulo="Usuário origem" usuario={usuarioOrigem} />
        <UsuarioCard titulo="Usuário destino" usuario={usuarioDestino} />
      </div>

      <div className="flex items-center justify-between">
        <Alert className="flex-1 mr-3">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Quantidade igual não significa permissão igual. Use o Preview por Campo para validar diferenças internas.
          </AlertDescription>
        </Alert>
        <Button onClick={handleComparar} disabled={!usuarioOrigem || !usuarioDestino || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
          Comparar
        </Button>
      </div>

      {comparacao && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tabela</TableHead>
                  <TableHead className="text-right">Qtd origem</TableHead>
                  <TableHead className="text-right">Qtd destino</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparacao.tabelas.map((t) => (
                  <TableRow key={t.tabela}>
                    <TableCell className="font-mono">{t.tabela}</TableCell>
                    <TableCell className="text-right">{t.qtd_origem}</TableCell>
                    <TableCell className="text-right">{t.qtd_destino}</TableCell>
                    <TableCell>{renderStatus(t.qtd_origem, t.qtd_destino)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
