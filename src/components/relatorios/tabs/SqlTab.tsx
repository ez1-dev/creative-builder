import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SqlEditor } from '../SqlEditor';
import { parseSqlParams, checkSqlSafe } from '@/lib/relatorios/parseSqlParams';
import { validarSql } from '@/lib/relatorios/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, Wand2, Play, Sparkles } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';

interface Props {
  sql: string;
  onChange: (sql: string) => void;
  onDetectParams: (params: string[]) => void;
  onPreview: () => void;
}

export function SqlTab({ sql, onChange, onDetectParams, onPreview }: Props) {
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'erro'>('idle');
  const [erro, setErro] = useState<string | null>(null);

  async function handleValidar() {
    if (!sql?.trim()) {
      setStatus('erro');
      setErro('Informe o SQL do relatório antes de continuar.');
      toast.error('Informe o SQL do relatório antes de continuar.');
      return;
    }
    const local = checkSqlSafe(sql);
    if (local) {
      setStatus('erro');
      setErro(local);
      toast.error(local);
      return;
    }
    setValidating(true);
    setErro(null);
    try {
      const res = await validarSql(sql);
      if (res.valido) {
        setStatus('ok');
        toast.success('SQL válida');
      } else {
        setStatus('erro');
        setErro(res.erro ?? 'SQL inválida');
        toast.error(res.erro ?? 'SQL inválida');
      }
    } catch (e: any) {
      setStatus('erro');
      setErro(e.message ?? String(e));
      toast.error('Erro ao validar SQL');
    } finally {
      setValidating(false);
    }
  }

  function handleDetect() {
    const params = parseSqlParams(sql);
    onDetectParams(params);
    toast.success(`${params.length} parâmetro(s) detectado(s)`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleValidar} disabled={validating} variant="outline" size="sm">
          {validating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
          Validar SQL
        </Button>
        <Button onClick={handleDetect} variant="outline" size="sm">
          <Wand2 className="h-4 w-4 mr-1" /> Detectar parâmetros
        </Button>
        <Button onClick={onPreview} variant="default" size="sm">
          <Play className="h-4 w-4 mr-1" /> Pré-visualizar
        </Button>
        {status === 'ok' && (
          <span className="text-xs text-success flex items-center gap-1 ml-2">
            <CheckCircle2 className="h-3 w-3" /> SQL válida
          </span>
        )}
        {status === 'erro' && erro && (
          <span className="text-xs text-destructive flex items-center gap-1 ml-2">
            <AlertCircle className="h-3 w-3" /> {erro.slice(0, 80)}
          </span>
        )}
      </div>
      <SqlEditor value={sql} onChange={onChange} height={460} />
      <p className="text-xs text-muted-foreground">
        Use parâmetros nomeados no formato <code className="px-1 py-0.5 bg-muted rounded">:cod_emp</code>,{' '}
        <code className="px-1 py-0.5 bg-muted rounded">:data_ini</code>,{' '}
        <code className="px-1 py-0.5 bg-muted rounded">:data_fim</code>. Apenas SELECT é permitido.
      </p>
    </div>
  );
}
