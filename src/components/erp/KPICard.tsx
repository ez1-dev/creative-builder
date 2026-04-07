import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface KPIDetail {
  label: string;
  value: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  tooltip?: string;
  details?: KPIDetail[];
  index?: number;
}

const variantClasses = {
  default: 'border-l-4 border-l-primary',
  success: 'border-l-4 border-l-[hsl(var(--success))]',
  warning: 'border-l-4 border-l-[hsl(var(--warning))]',
  destructive: 'border-l-4 border-l-destructive',
  info: 'border-l-4 border-l-[hsl(var(--info))]',
};

export function KPICard({ title, value, subtitle, icon, variant = 'default', tooltip, details, index = 0 }: KPICardProps) {
  const hasDetails = details && details.length > 0;

  const cardContent = (
    <Card className={cn('transition-shadow hover:shadow-md', variantClasses[variant], hasDetails && 'cursor-pointer')}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">{title}</p>
              {tooltip && <Info className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground truncate">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {icon && <div className="text-muted-foreground shrink-0 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );

  const wrappedWithTooltip = tooltip ? (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {hasDetails ? cardContent : <div>{cardContent}</div>}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : hasDetails ? cardContent : <div>{cardContent}</div>;

  const animationWrapper = (children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );

  if (hasDetails) {
    return animationWrapper(
      <Popover>
        <PopoverTrigger asChild>
          {tooltip ? (
            <div>{wrappedWithTooltip}</div>
          ) : (
            <div>{cardContent}</div>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" side="bottom" align="start">
          <div className="border-b px-4 py-2">
            <p className="text-sm font-semibold">{title}</p>
            {tooltip && <p className="text-xs text-muted-foreground">{tooltip}</p>}
          </div>
          <div className="divide-y">
            {details.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 text-xs">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return animationWrapper(wrappedWithTooltip);
}
