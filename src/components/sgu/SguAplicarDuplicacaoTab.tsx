import { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSgu } from './SguContext';
import {
  duplicarParametros,
  duplicarPreviewCampos,
  compararUsuarios,
  TABELAS_E099,
} from '@/lib/sguApi';
import { toast } from 'sonner';

export function SguAplicarDuplicacaoTab() {
  const {
    usuarioOrigem,
    usuarioDestino,
    preview,
    setPreview,
    setComparacao,
    mostrarCamposIguais,
  } = useSgu();
  const [motivo, setMotivo] = useState('');
  const [confirmou, setConfirmou] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [palavraConfirma, setPalavraConfirma] = useState('');
  const [aplicando, setAplicando] = useState(false);

  const motivoOk = motivo.trim().length >= 10;
  const temDiferencas = !!preview && preview.total_diferencas > 0;
  const podeAplicar =
    !!usuarioOrigem && !!usuarioDestino && !!preview && temDiferencas && motivoOk && confirmou;

  const handleAplicar = async () => {
    if (!usuarioOrigem || !usuarioDestino) return;
    setAplicando(true);
    try {
      await duplicarParametros({
        usuario_origem: usuarioOrigem.codusu,
        usuario_destino: usuarioDestino.codusu,
        motivo,
        tabelas: TABELAS_E099,
      });
      toast.success(
        'Parâmetros SGU duplicados com sucesso. Senha, login, bloqueio e cadastro base não foram alterados.',
      );
      setDialogOpen(false);
      setPalavraConfirma('');
      setMotivo('');
      setConfirmou(false);

      // Recarrega comparação e preview
      try {
        const [c, p] = await Promise.all([
          compararUsuarios(usuarioOrigem.codusu, usuarioDestino.codusu),
          duplicarPreviewCampos({
            usuario_origem: usuarioOrigem.codusu,
            usuario_destino: usuarioDestino.codusu,
            tabelas: TABELAS_E099,
            mostrar_campos_iguais: mostrarCamposIguais,
          }),
        ]);
        setComparacao(c);
        setPreview(p);
      } catch {
        // tratado
      }
    } catch {
      // tratado em sguApi
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Operação crítica</AlertTitle>
        <AlertDescription>
          Esta ação grava parâmetros do usuário origem sobre o usuário destino. Confira o preview campo a campo antes de aplicar.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Origem</CardTitle></CardHeader>
          <CardContent>
            {usuarioOrigem ? (
              <>
                <div className="font-mono text-xs text-muted-foreground">#{usuarioOrigem.codusu}</div>
                <div className="font-semibold">{usuarioOrigem.nomusu}</div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Não selecionado.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Destino</CardTitle></CardHeader>
          <CardContent>
            {usuarioDestino ? (
              <>
                <div className="font-mono text-xs text-muted-foreground">#{usuarioDestino.codusu}</div>
                <div className="font-semibold">{usuarioDestino.nomusu}</div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Não selecionado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Tabelas afetadas</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {TABELAS_E099.map((t) => (
            <Badge key={t} variant="outline" className="font-mono">{t}</Badge>
          ))}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo do preview</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div><span className="text-muted-foreground">Diferenças:</span> <strong>{preview.total_diferencas}</strong></div>
            <div><span className="text-muted-foreground">Alterar:</span> <strong>{preview.total_alterar}</strong></div>
            <div><span className="text-muted-foreground">Manter:</span> <strong>{preview.total_manter}</strong></div>
            <div><span className="text-muted-foreground">Inserir:</span> <strong>{preview.total_inserir}</strong></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="motivo">Motivo da duplicação (mín. 10 caracteres)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Duplicação de parâmetros validada pelo TI"
              rows={3}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={confirmou}
              onCheckedChange={(v) => setConfirmou(!!v)}
              className="mt-0.5"
            />
            <span>
              Confirmo que revisei o preview e desejo aplicar os parâmetros do usuário origem no destino.
            </span>
          </label>
          {!preview && (
            <p className="text-xs text-destructive">Gere o preview na aba anterior antes de aplicar.</p>
          )}
          {preview && !temDiferencas && (
            <p className="text-xs text-muted-foreground">Não há diferenças a aplicar.</p>
          )}
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!podeAplicar}
            variant="destructive"
          >
            <ShieldAlert className="h-4 w-4" /> Aplicar duplicação
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar duplicação de parâmetros</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a copiar os parâmetros E099* de{' '}
              <strong>#{usuarioOrigem?.codusu} {usuarioOrigem?.nomusu}</strong> para{' '}
              <strong>#{usuarioDestino?.codusu} {usuarioDestino?.nomusu}</strong>.
              <br />
              Para liberar a confirmação, digite <strong>CONFIRMAR</strong> abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={palavraConfirma}
            onChange={(e) => setPalavraConfirma(e.target.value)}
            placeholder="Digite CONFIRMAR"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aplicando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={palavraConfirma !== 'CONFIRMAR' || aplicando}
              onClick={(e) => {
                e.preventDefault();
                handleAplicar();
              }}
            >
              {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Aplicar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
