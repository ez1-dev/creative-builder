import { PieChartCard, PieChartCardProps } from './PieChartCard';

export function DonutChartCard(props: Omit<PieChartCardProps, 'donut'>) {
  return <PieChartCard {...props} donut />;
}
