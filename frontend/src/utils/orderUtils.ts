import { OrderRecord } from '../backend';

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

export function generateOrderId(existingOrders: OrderRecord[]): string {
  const year = new Date().getFullYear();
  const prefix = `VW-${year}-`;
  let maxNum = 0;
  for (const o of existingOrders) {
    if (o.orderId.startsWith(prefix)) {
      const num = parseInt(o.orderId.substring(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const next = maxNum + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export function generateInvoiceNumber(orderId: string): string {
  return `INV-${orderId}`;
}

export function encodeQRData(orderId: string): string {
  return btoa(`VITALIST:${orderId}`);
}

export function decodeQRData(qrData: string): string | null {
  try {
    const decoded = atob(qrData);
    if (decoded.startsWith('VITALIST:')) {
      return decoded.substring(9);
    }
    // Try direct order ID
    if (qrData.startsWith('VW-')) return qrData;
    return null;
  } catch {
    if (qrData.startsWith('VW-')) return qrData;
    return null;
  }
}

export const ORDER_STATUSES = [
  'Pending Approval',
  'Approved',
  'Ready',
  'Dispatched',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Pending Approval': return 'status-badge-pending';
    case 'Approved': return 'status-badge-approved';
    case 'Ready': return 'status-badge-ready';
    case 'Dispatched': return 'status-badge-dispatched';
    case 'Out for Delivery': return 'status-badge-out-for-delivery';
    case 'Delivered': return 'status-badge-delivered';
    case 'Cancelled': return 'status-badge-cancelled';
    default: return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'Pending Approval': return '⏳';
    case 'Approved': return '✅';
    case 'Ready': return '📦';
    case 'Dispatched': return '🚚';
    case 'Out for Delivery': return '📍';
    case 'Delivered': return '🎉';
    case 'Cancelled': return '❌';
    default: return '•';
  }
}
