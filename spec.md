# Specification

## Summary
**Goal:** Fix three broken flows in the Vitalist Water app: invoice generation/rendering, delivery panel order assignment visibility, and the end-to-end QR scan pipeline.

**Planned changes:**
- Fix `InvoiceModal` → `InvoiceView` call path so invoices correctly fetch and render order details, store info, line items, and the QR code; add null/undefined guards and a loading state.
- Fix the delivery assignment flow so that after an admin assigns an order to a delivery user, the order immediately appears in that delivery user's `DeliveryDashboard`; audit and align how `assignedDeliveryUser` is stored in the backend versus how the dashboard query filters by it.
- Fix the QR scan flow in `ScanPage` and `DeliveryDashboard` so the camera activates reliably, the scanned value is decoded using the VITALIST-prefix/base64 logic, the decoded order ID is matched to a real order, and the correct status-transition mutation is called; show a clear error for unrecognized QR codes.
- Fix `QRPrintView` and `QRCodeDisplay` to generate the QR image URL correctly via `qrGenerator.ts` (VITALIST-prefixed, base64-encoded order ID) and ensure it loads without CORS or URL encoding errors, matching exactly what the scan decoder expects.

**User-visible outcome:** Admins can open any order's invoice modal and see a fully rendered invoice. Delivery users see orders assigned to them appear in their dashboard. Scanning a valid QR code in any role-based flow correctly identifies the order and triggers the status update, while invalid codes show a friendly error.
