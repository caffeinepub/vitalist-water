/**
 * QR code generation utilities.
 * Uses the goqr.me API to generate QR code images.
 * The encoded value uses VITALIST prefix + base64 order ID to match the decoder in orderUtils.ts.
 */

/**
 * Encodes an order ID into the QR code value format:
 * "VITALIST:" + base64(orderId)
 */
export function encodeOrderIdForQR(orderId: string): string {
  try {
    const encoded = btoa(unescape(encodeURIComponent(orderId)));
    return `VITALIST:${encoded}`;
  } catch {
    return `VITALIST:${orderId}`;
  }
}

/**
 * Generates a QR code image URL for the given order ID.
 * The QR code encodes: "VITALIST:" + base64(orderId)
 */
export function generateQRCodeURL(orderId: string, size: number = 200): string {
  if (!orderId) return '';
  const qrValue = encodeOrderIdForQR(orderId);
  const encodedValue = encodeURIComponent(qrValue);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&format=png&margin=10`;
}

/**
 * Generates a QR code image URL from a raw QR value (already encoded).
 * Use this when you already have the full VITALIST:... value.
 */
export function generateQRCodeURLFromValue(qrValue: string, size: number = 200): string {
  if (!qrValue) return '';
  const encodedValue = encodeURIComponent(qrValue);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&format=png&margin=10`;
}
