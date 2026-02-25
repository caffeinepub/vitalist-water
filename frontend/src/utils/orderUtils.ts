/**
 * Order utility functions for status management, QR encoding/decoding,
 * and workflow stage helpers.
 */

// ─── Workflow Stage Objects ───────────────────────────────────────────────────

export interface WorkflowStage {
  key: string;
  label: string;
  step: number;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'Pending Approval', label: 'Pending Approval', step: 1 },
  { key: 'Approved', label: 'Approved', step: 2 },
  { key: 'Ready', label: 'Ready', step: 3 },
  { key: 'Assigned to Delivery', label: 'Assigned to Delivery', step: 4 },
  { key: 'Dispatched', label: 'Dispatched', step: 5 },
  { key: 'Out for Delivery', label: 'Out for Delivery', step: 6 },
  { key: 'Trucks in Transit', label: 'Trucks in Transit', step: 7 },
  { key: 'Distributor Confirmations Pending', label: 'Distributor Confirmations Pending', step: 8 },
  { key: 'Delivered', label: 'Delivered', step: 9 },
];

export const WORKFLOW_STAGE_KEYS: string[] = WORKFLOW_STAGES.map((s) => s.key);

export function getStageIndex(status: string): number {
  return WORKFLOW_STAGES.findIndex((s) => s.key === status);
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Pending Approval': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'Approved': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'Ready': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'Assigned to Delivery': return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'Dispatched': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'Out for Delivery': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
    case 'Trucks in Transit': return 'text-teal-600 bg-teal-50 border-teal-200';
    case 'Distributor Confirmations Pending': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'Delivered': return 'text-green-600 bg-green-50 border-green-200';
    case 'Locked': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStatusBadgeClass(status: string): string {
  return getStatusColor(status);
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'Pending Approval': return '⏳';
    case 'Approved': return '✅';
    case 'Ready': return '📦';
    case 'Assigned to Delivery': return '🚚';
    case 'Dispatched': return '🚀';
    case 'Out for Delivery': return '🛵';
    case 'Trucks in Transit': return '🚛';
    case 'Distributor Confirmations Pending': return '📋';
    case 'Delivered': return '🎉';
    case 'Locked': return '🔒';
    default: return '📄';
  }
}

// ─── Workflow Helpers ─────────────────────────────────────────────────────────

export function isOrderLocked(status: string): boolean {
  return status === 'Delivered' || status === 'Locked';
}

export function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const currentIndex = getStageIndex(currentStatus);
  const newIndex = getStageIndex(newStatus);
  if (currentIndex === -1 || newIndex === -1) return false;
  return newIndex === currentIndex + 1;
}

// ─── Notes / Meta Helpers ─────────────────────────────────────────────────────

export function parseOrderMeta(notes: string): Record<string, string> {
  const meta: Record<string, string> = {};
  if (!notes) return meta;
  const lines = notes.split('\n');
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.substring(0, idx).trim();
      const value = line.substring(idx + 1).trim();
      if (key) meta[key] = value;
    }
  }
  return meta;
}

export function buildNotesWithMeta(
  baseNotes: string,
  meta: Record<string, string>
): string {
  const metaLines = Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  if (!baseNotes) return metaLines;
  if (!metaLines) return baseNotes;
  return `${baseNotes}\n${metaLines}`;
}

// ─── QR Encode / Decode ───────────────────────────────────────────────────────

/**
 * Encodes an order ID into the QR value format: "VITALIST:" + base64(orderId)
 */
export function encodeQRData(orderId: string): string {
  try {
    const encoded = btoa(unescape(encodeURIComponent(orderId)));
    return `VITALIST:${encoded}`;
  } catch {
    return `VITALIST:${orderId}`;
  }
}

/**
 * Decodes a scanned QR value back to the order ID.
 * Accepts:
 *   - "VITALIST:<base64>" → decodes base64 to get orderId
 *   - Plain order ID (no prefix) → returns as-is
 * Returns null for invalid/malformed input.
 */
export function decodeQRData(scannedValue: string): string | null {
  if (!scannedValue) return null;

  try {
    const trimmed = scannedValue.trim();

    if (trimmed.startsWith('VITALIST:')) {
      const encoded = trimmed.substring('VITALIST:'.length);
      if (!encoded) return null;
      try {
        const decoded = decodeURIComponent(escape(atob(encoded)));
        return decoded || null;
      } catch {
        return encoded || null;
      }
    }

    if (trimmed.length > 0) {
      return trimmed;
    }

    return null;
  } catch {
    return null;
  }
}
