import type { BadgeVariant } from '../components/common/Badge';

export function getStatusBadgeVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'APPROVED' || s === 'PAID') return 'success';
  if (s === 'PENDING' || s === 'DRAFT' || s === 'PROCESSING' || s === 'INVITED') return 'warning';
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'FAILED' || s === 'DISABLED') return 'neutral';
  if (s === 'INFO' || s === 'SCHEDULED') return 'info';
  return 'neutral';
}
