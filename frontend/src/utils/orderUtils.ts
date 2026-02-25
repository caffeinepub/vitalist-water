import { OrderRecord } from '../backend';

// ─── Workflow stages ──────────────────────────────────────────────────────────

export const WORKFLOW_STAGES = [
  { key: 'Pending Approval', label: 'Created', step: 1 },
  { key: 'Approved', label: 'Approved', step: 2 },
  { key: 'Assigned to Delivery', label: 'QR Generated', step: 3 },
  { key: 'Ready', label: 'Ready', step: 4 },
  { key: 'Dispatched', label: 'Dispatched', step: 5 },
  { key: 'Out for Delivery', label: 'Out for Delivery', step: 6 },
  { key: 'Trucks in Transit', label: 'In Transit', step: 7 },
  { key: 'Distributor Confirmations Pending', label: 'Arrived', step: 8 },
  { key: 'Delivered', label: 'Delivered', step: 9 },
];

export function getStageIndex(status: string): number {
  const idx = WORKFLOW_STAGES.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function isOrderLocked(status: string): boolean {
  return status === 'Delivered' || status === 'Locked';
}

// ─── Order ID / Invoice ───────────────────────────────────────────────────────

export function generateOrderId(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(4, '0');
  return `VW-${year}-${seq}`;
}

export function generateInvoiceNumber(orderId: string): string {
  return `INV-${orderId}`;
}

// ─── QR helpers ───────────────────────────────────────────────────────────────

export function encodeQRData(orderId: string): string {
  return btoa(`VITALIST:${orderId}`);
}

export function decodeQRData(qrData: string): string | null {
  try {
    const decoded = atob(qrData);
    if (decoded.startsWith('VITALIST:')) {
      return decoded.substring(9);
    }
    if (qrData.startsWith('VW-')) return qrData;
    return null;
  } catch {
    if (qrData.startsWith('VW-')) return qrData;
    return null;
  }
}

// ─── Notes / meta helpers ─────────────────────────────────────────────────────

export interface OrderMeta {
  qrData?: string;
  stage1Timestamp?: number;
  stage2Timestamp?: number;
  stage3Timestamp?: number;
  stage3Lat?: number;
  stage3Lng?: number;
  stage4Timestamp?: number;
  stage4Lat?: number;
  stage4Lng?: number;
  invoiceNumber?: string;
}

export function parseOrderMeta(notes: string): { userNotes: string; meta: OrderMeta } {
  try {
    const idx = notes.indexOf('||META:');
    if (idx === -1) return { userNotes: notes, meta: {} };
    const userNotes = notes.substring(0, idx);
    const metaStr = notes.substring(idx + 7);
    const meta = JSON.parse(metaStr) as OrderMeta;
    return { userNotes, meta };
  } catch {
    return { userNotes: notes, meta: {} };
  }
}

export function buildNotesWithMeta(userNotes: string, meta: OrderMeta): string {
  return `${userNotes}||META:${JSON.stringify(meta)}`;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  'Pending Approval',
  'Approved',
  'Assigned to Delivery',
  'Ready',
  'Dispatched',
  'Out for Delivery',
  'Trucks in Transit',
  'Distributor Confirmations Pending',
  'Delivered',
  'Cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Pending Approval':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'Approved':
      return 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Assigned to Delivery':
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'Ready':
      return 'bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300';
    case 'Dispatched':
      return 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300';
    case 'Out for Delivery':
      return 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300';
    case 'Trucks in Transit':
      return 'bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300';
    case 'Distributor Confirmations Pending':
      return 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
    case 'Delivered':
      return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300';
    case 'Cancelled':
      return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'Pending Approval': return '⏳';
    case 'Approved': return '✅';
    case 'Assigned to Delivery': return '📋';
    case 'Ready': return '📦';
    case 'Dispatched': return '🚚';
    case 'Out for Delivery': return '📍';
    case 'Trucks in Transit': return '🛣️';
    case 'Distributor Confirmations Pending': return '📸';
    case 'Delivered': return '🎉';
    case 'Cancelled': return '❌';
    default: return '•';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Pending Approval':
      return 'status-pending';
    case 'Approved':
    case 'Assigned to Delivery':
      return 'status-approved';
    case 'Ready':
    case 'Dispatched':
      return 'status-dispatched';
    case 'Out for Delivery':
    case 'Trucks in Transit':
      return 'status-out-for-delivery';
    case 'Distributor Confirmations Pending':
      return 'status-pending';
    case 'Delivered':
      return 'status-delivered';
    default:
      return 'status-pending';
  }
}

export function getNextAllowedStatus(currentStatus: string, role: string): string | null {
  const transitions: Record<string, Record<string, string>> = {
    admin: {
      'Pending Approval': 'Approved',
      'Approved': 'Assigned to Delivery',
      'Assigned to Delivery': 'Ready',
    },
    staff: {
      'Ready': 'Dispatched',
    },
    delivery: {
      'Dispatched': 'Out for Delivery',
      'Out for Delivery': 'Trucks in Transit',
    },
    distributor: {
      'Trucks in Transit': 'Distributor Confirmations Pending',
      'Distributor Confirmations Pending': 'Delivered',
    },
  };
  return transitions[role]?.[currentStatus] ?? null;
}

export function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions: Record<string, string[]> = {
    'Pending Approval': ['Approved'],
    'Approved': ['Assigned to Delivery'],
    'Assigned to Delivery': ['Ready'],
    'Ready': ['Dispatched'],
    'Dispatched': ['Out for Delivery'],
    'Out for Delivery': ['Trucks in Transit'],
    'Trucks in Transit': ['Distributor Confirmations Pending'],
    'Distributor Confirmations Pending': ['Delivered'],
  };
  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}
