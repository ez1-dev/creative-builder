/**
 * Renderiza o conteúdo do <Select> "Série / dados" agrupando as opções em
 * seções para facilitar a navegação quando o schema da página tem muitas
 * combinações (ex.: Manutenção de Frota com dimensão × métrica).
 *
 * Heurística de agrupamento por prefixo da chave:
 *   - `mensal__...`    → "Evolução mensal"
 *   - `por_*__*`       → "Por dimensão"
 *   - demais chaves    → "Legado / outros"
 *
 * Funciona com qualquer página: páginas que não usam o esquema novo caem
 * todas no grupo "Legado / outros" sem perda de comportamento.
 */
import { SelectGroup, SelectItem, SelectLabel } from '@/components/ui/select';

export interface SeriesOption {
  key: string;
  label: string;
}

export function SeriesSelectGroups({ options }: { options: SeriesOption[] }) {
  const mensal: SeriesOption[] = [];
  const anual: SeriesOption[] = [];
  const porDim: SeriesOption[] = [];
  const legado: SeriesOption[] = [];

  options.forEach((o) => {
    if (o.key.startsWith('mensal__')) mensal.push(o);
    else if (o.key.startsWith('anual__')) anual.push(o);
    else if (/^por_.+__/.test(o.key)) porDim.push(o);
    else legado.push(o);
  });

  return (
    <>
      {mensal.length > 0 && (
        <SelectGroup>
          <SelectLabel>Evolução mensal</SelectLabel>
          {mensal.map((s) => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectGroup>
      )}
      {porDim.length > 0 && (
        <SelectGroup>
          <SelectLabel>Por dimensão</SelectLabel>
          {porDim.map((s) => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectGroup>
      )}
      {legado.length > 0 && (
        <SelectGroup>
          <SelectLabel>{mensal.length + porDim.length > 0 ? 'Legado / outros' : 'Séries'}</SelectLabel>
          {legado.map((s) => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectGroup>
      )}
    </>
  );
}
