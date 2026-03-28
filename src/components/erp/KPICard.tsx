import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}

const variantClasses = {
  default: 'border-l-4 border-l-primary',
  success: 'border-l-4 border-l-[hsl(var(--success))]',
  warning: 'border-l-4 border-l-[hsl(var(--warning))]',
  destructive: 'border-l-4 border-l-destructive',
  info: 'border-l-4 border-l-[hsl(var(--info))]',
};

export function KPICard({ title, value, subtitle, icon, variant = 'default' }: KPICardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', variantClasses[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
