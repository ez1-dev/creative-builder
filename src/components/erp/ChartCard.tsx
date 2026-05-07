import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  icon?: ReactNode;
  count?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, icon, count, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
          {count != null && <span className="ml-auto text-xs font-normal text-muted-foreground">{count}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
