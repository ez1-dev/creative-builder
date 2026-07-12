import { EyeOff } from 'lucide-react';
import { useDemoMode } from '@/contexts/DemoModeContext';

export function DemoBadge() {
  const { active } = useDemoMode();
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[60] flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 shadow-sm backdrop-blur">
      <EyeOff className="h-3.5 w-3.5" />
      Modo Demonstração
    </div>
  );
}
