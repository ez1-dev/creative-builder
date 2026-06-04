import { useEffect, useState } from 'react';
import { listRelatorios, getRelatorio } from '@/lib/relatorios/api';
import { ReportPreview } from '@/components/relatorios/ReportPreview';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Relatorio, RelatorioParametro } from '@/lib/relatorios/types';
import { toast } from 'sonner';

export default function RelatoriosPublicadosPage() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ r: Relatorio; params: RelatorioParametro[] } | null>(null);

  useEffect(() => {
    listRelatorios({ status: 'publicado' })
      .then(setRelatorios)
      .catch((e) => toast.error(e.message));
  }, []);

  const filtered = relatorios.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return r.nome.toLowerCase().includes(q) || (r.modulo ?? '').toLowerCase().includes(q);
  });

  async function abrir(r: Relatorio) {
    const { parametros } = await getRelatorio(r.id);
    setSelected({ r, params: parametros });
  }

  if (selected) {
    return (
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold mb-1">{selected.r.nome}</h1>
        {selected.r.descricao && <p className="text-sm text-muted-foreground mb-4">{selected.r.descricao}</p>}
        <ReportPreview
          relatorio={selected.r}
          parametros={selected.params.map(({ id: _, relatorio_id: __, ...rest }) => rest)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Relatórios Publicados</h1>
        <p className="text-sm text-muted-foreground">Selecione um relatório para executar.</p>
      </header>
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id="busca-relatorio" name="busca-relatorio" aria-label="Buscar relatório" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-12">
            Nenhum relatório publicado.
          </p>
        )}
        {filtered.map((r) => (
          <Card
            key={r.id}
            onClick={() => abrir(r)}
            className="p-4 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm leading-tight">{r.nome}</h3>
              {r.modulo && <Badge variant="outline" className="text-[10px]">{r.modulo}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{r.descricao ?? '—'}</p>
            <div className="text-[10px] text-muted-foreground mt-2 font-mono">{r.codigo}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
