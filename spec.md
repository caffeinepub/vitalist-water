# Specification

## Summary
**Goal:** Add a Distributor Delivery Data management system (Admin creates records, Distributors view their assignments and mark truck arrival), and fix the broken map functionality in the Add/Edit Store dialog.

**Planned changes:**
- Add a "Distributor Delivery Data" section in the Admin panel with a form to create, edit, and delete delivery records (fields: Order ID, Truck Number, Driver Name, Driver Contact Number, Distributor, Estimated Delivery Date/Time, Notes).
- Store distributor delivery records in a stable backend data structure with role-based access control; expose queries for all records (admin) and filtered by distributor user ID (distributor role).
- Add a Distributor Dashboard page accessible only to users with the "distributor" role, displaying their assigned delivery records as cards/rows with Order ID, Store Name, Truck Number, Driver Name, Driver Contact, Estimated Delivery Date/Time, and Order Status.
- Add a "Mark Truck Arrived" button on each distributor delivery card that updates the record status server-side; button is disabled after already marked.
- Restrict Distributor Dashboard navigation so distributor-role users only see the Distributor Dashboard nav item in the sidebar.
- Fix the Add Store / Edit Store map in StoreManagementPage.tsx: replace broken map tile dependency with an OpenStreetMap iframe embed or Leaflet/static map fallback; ensure "Use Current Location" populates latitude/longitude fields and updates the map preview; ensure manual lat/lng edits sync with the map in real time.

**User-visible outcome:** Admins can manage distributor delivery assignments from the Admin panel; distributors can log in to their dedicated dashboard to view their deliveries and mark when a truck has arrived. The Add/Edit Store map works correctly in all modern browsers without errors.
