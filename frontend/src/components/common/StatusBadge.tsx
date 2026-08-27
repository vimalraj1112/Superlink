import { clsx } from 'clsx';
import {
  SiteStatus,
  SiteStatusLabels,
  SiteStatusColors,
  TicketStatus,
  TicketStatusLabels,
  TicketStatusColors,
  TicketPriority,
  TicketPriorityLabels,
  TicketPriorityColors,
  TicketSource,
  TicketSourceLabels,
  TicketSourceColors,
} from '@/types/enums';

type BadgeType = 'site' | 'ticket-status' | 'ticket-priority' | 'ticket-source' | 'custom';

interface StatusBadgeProps {
  type: BadgeType;
  value: string;
  label?: string;
  className?: string;
}

export default function StatusBadge({ type, value, label, className }: StatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (type) {
      case 'site':
        return {
          label: label || SiteStatusLabels[value as SiteStatus] || value,
          color: SiteStatusColors[value as SiteStatus] || 'bg-gray-100 text-gray-800',
        };
      case 'ticket-status':
        return {
          label: label || TicketStatusLabels[value as TicketStatus] || value,
          color: TicketStatusColors[value as TicketStatus] || 'bg-gray-100 text-gray-800',
        };
      case 'ticket-priority':
        return {
          label: label || TicketPriorityLabels[value as TicketPriority] || value,
          color: TicketPriorityColors[value as TicketPriority] || 'bg-gray-100 text-gray-800',
        };
      case 'ticket-source':
        return {
          label: label || TicketSourceLabels[value as TicketSource] || value,
          color: TicketSourceColors[value as TicketSource] || 'bg-gray-100 text-gray-800',
        };
      default:
        return {
          label: label || value,
          color: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span className={clsx('badge', config.color, className)}>
      {config.label}
    </span>
  );
}