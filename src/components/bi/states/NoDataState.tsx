import { BarChart3 } from 'lucide-react';
import { EmptyState } from './EmptyState';

export function NoDataState({ height = 200, message = 'Sem dados para exibir' }: { height?: number; message?: string }) {
  return <EmptyState icon={<BarChart3 className="h-8 w-8" />} title={message} description="" height={height} />;
}
