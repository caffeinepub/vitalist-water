# Specification

## Summary
**Goal:** Build Vitalist Water, a full-stack order and delivery management system with role-based access, GPS-enabled store management, a 4-stage QR-scanned workflow, automated invoicing, and a professional water-blue SaaS UI.

**Planned changes:**

### Authentication & Users
- Role-based login (Admin, Staff, Delivery) with session tokens and route guards
- Pre-seeded demo accounts: admin@vitalist.com, staff@vitalist.com, delivery@vitalist.com (all India@123)
- Admin can create, edit, and delete user accounts

### Store Management
- Store records: Name, Owner Name, Mobile, Address, Landmark, Latitude, Longitude, Timestamp
- Add/Edit form with "Use Current Location" (browser Geolocation API), live coordinate preview, and manual coordinate adjustment
- Searchable store list; Admin can edit and delete stores

### Order Creation (Staff)
- Order form: Select Store, Quantity, Rate, Notes
- System auto-generates Order ID in VW-YYYY-XXXX format (auto-incrementing, unique, not manually editable)
- Order saved with status "Pending Approval" and a draft invoice record

### Admin Order Approval
- Admin views "Pending Approval" orders and can approve or cancel them
- On approval: status → "Approved", QR code generated (encodes Order ID in base64) and stored (one QR per order)
- Cancelled orders locked with status "Cancelled"

### 4-Stage QR Workflow
- Stage 1 (Admin Scan): Approved → Ready; timestamp saved; duplicate scans rejected
- Stage 2 (Staff Scan): Ready → Dispatched; timestamp logged
- Stage 3 (Delivery Scan – Start): Dispatched → Out for Delivery; GPS + timestamp required
- Stage 4 (Delivery Scan – Complete): Out for Delivery → Delivered; GPS + timestamp required; order permanently locked
- All stage transitions validated server-side; out-of-sequence or re-scans rejected

### Camera-Based QR Scanning
- "Scan QR" button opens a real-time camera overlay (jsQR or React QR scanner library)
- Decoded Order ID triggers backend stage transition; no manual text entry allowed

### Automated Invoice System
- Draft invoice created on order creation; includes branding, Order ID, Invoice Number, store details, Quantity, Rate, Total, Date/Time
- QR code added to invoice only after admin approval
- Admin can download/print invoice as PDF (jsPDF or html2canvas)
- Invoice reflects "Delivered" status upon completion

### Delivery Panel (Mobile-Optimized)
- Shows assigned orders in Dispatched or Out for Delivery status
- Each card: Store Name, Owner Contact, estimated distance (device GPS → store GPS), "Open in Google Maps" deep-link button, "Scan QR" button
- Fully responsive, mobile-first layout

### Admin Order Management Panel
- Paginated/scrollable table of all orders
- Filters: date range (DD-MM-YYYY), store, status; search by Order ID
- Full order details in modal/drawer; invoice PDF download per order; delivery progress visible

### Dashboard & UI Shell
- Fixed left sidebar: Dashboard, Stores, Orders, Invoices, QR Management, Reports, Settings
- Dashboard summary cards: Total Orders Today, Pending, Ready, Out for Delivery, Delivered
- Collapsible/hamburger sidebar on mobile
- Water-blue corporate theme (deep ocean blues, aqua accents), soft-shadow cards, smooth transitions, bold sans-serif typography
- Vitalist Water brand name and logo in sidebar header and invoices

### Backend Validation
- Enforce all stage-transition sequences server-side
- Reject QR generation before approval, duplicate Order IDs, duplicate scans, out-of-sequence transitions
- Require GPS for Stage 3 & 4; lock delivered orders from any further changes
- Store all stage timestamps on the order record

**User-visible outcome:** Admin, Staff, and Delivery users each have a dedicated, role-gated experience. Staff create orders, Admin approves them and generates QR codes, warehouse and delivery staff scan QR codes at each stage to advance the order through a 4-step workflow, and Admin can view/filter all orders, download invoices, and monitor delivery progress — all within a professional, mobile-responsive water-blue SaaS interface.
