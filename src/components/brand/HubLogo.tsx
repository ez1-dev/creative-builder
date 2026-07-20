import { cn } from '@/lib/utils';

interface HubLogoProps {
  variant?: 'symbol' | 'horizontal';
  className?: string;
  wordmarkClassName?: string;
}

function Symbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="HUB Gestão"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M50 4 L8 27 V73 L50 96 Z" fill="#1565FF" />
      <path d="M50 4 L92 27 V73 L50 96 Z" fill="#22C55E" />
      <path
        d="M22 32 h8 v14 h14 v-14 h8 v36 h-8 v-14 h-14 v14 h-8 z"
        fill="#FFFFFF"
      />
      <rect x="58" y="54" width="6" height="14" fill="#FFFFFF" />
      <rect x="66" y="46" width="6" height="22" fill="#FFFFFF" />
      <rect x="74" y="36" width="6" height="32" fill="#FFFFFF" />
    </svg>
  );
}

export function HubLogo({
  variant = 'horizontal',
  className,
  wordmarkClassName,
}: HubLogoProps) {
  if (variant === 'symbol') {
    return <Symbol className={cn('h-8 w-8', className)} />;
  }
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Symbol className="h-9 w-9 shrink-0" />
      <div className={cn('flex flex-col leading-none', wordmarkClassName)}>
        <span
          className="text-[19px] font-extrabold tracking-tight"
          style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
        >
          HUB
        </span>
        <span
          className="text-[11px] font-semibold tracking-[0.22em]"
          style={{ color: '#22C55E', fontFamily: "'Poppins', system-ui, sans-serif" }}
        >
          GESTÃO
        </span>
      </div>
    </div>
  );
}
