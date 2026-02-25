# Specification

## Summary
**Goal:** Fix the blank page crash that occurs after deployment by diagnosing runtime errors, adding an error boundary, and ensuring all components have proper Suspense boundaries.

**Planned changes:**
- Audit `App.tsx` for runtime errors including undefined variable access, failed imports, missing null guards on authentication state, and role-based routing logic that may throw before rendering
- Ensure the app renders a visible UI for all authentication states (unauthenticated, loading, authenticated with any role)
- Add a top-level `ErrorBoundary` component wrapping the entire React app that displays a user-friendly fallback UI with the app name, an error message, and a reload button
- Wrap all dynamically imported/lazy-loaded components (SatelliteMapView, QRScanModal, BarcodeScanStep, etc.) with `React.Suspense` and loading fallbacks

**User-visible outcome:** After deployment, the app consistently displays either the login page or the appropriate dashboard instead of a blank page, and any unexpected render errors show a friendly fallback UI with a reload button rather than a blank screen.
