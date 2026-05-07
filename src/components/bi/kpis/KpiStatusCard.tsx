import { KpiCard, KpiCardProps } from './KpiCard';
import { BiStatus } from '../badges/StatusBadge';

export function KpiStatusCard(props: KpiCardProps & { status: BiStatus }) {
  return <KpiCard {...props} />;
}
