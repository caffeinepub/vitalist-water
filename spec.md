# Specification

## Summary
**Goal:** Fix two bugs affecting newly created users: missing user ID display in the admin panel and inability to log in after creation.

**Planned changes:**
- Fix the backend `addUser` function in `main.mo` to generate and persist a valid unique user ID for every new user, and return it in the response.
- Fix the `UserManagementPage.tsx` user table to correctly display the user ID for newly created users, including re-fetching the user list via React Query invalidation after a successful add.
- Fix the backend `login` function in `main.mo` to look up users by email across the full users map (including dynamically added users), verify passwords correctly, and return a valid session token and role.
- Fix `AuthContext.tsx` to correctly process the login response and store the token and role in sessionStorage for newly created users.

**User-visible outcome:** After an admin creates a new user, the user's ID appears immediately in the user table. The newly created user can then log in with their credentials and be routed to the appropriate dashboard for their role.
