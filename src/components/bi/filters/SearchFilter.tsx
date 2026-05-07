import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

export function SearchFilter({
  label = 'Buscar', value, onChange, placeholder = 'Digite para buscar...', debounceMs = 300,
}: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; debounceMs?: number }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => { if (local !== value) onChange(local); }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} className="h-8 pl-7 text-xs" />
      </div>
    </div>
  );
}
