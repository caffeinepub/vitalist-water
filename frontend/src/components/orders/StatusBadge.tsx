import React from 'react';
import { getStatusColor, getStatusIcon } from '../../utils/orderUtils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const icon = getStatusIcon(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colorClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span>{icon}</span>
      {status}
    </span>
  );
}
