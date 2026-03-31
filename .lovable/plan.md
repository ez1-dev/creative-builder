

# Fix: Race Condition Causing "Acesso Pendente" for Approved Users

## Problem
In `AuthContext.tsx`, `setLoading(false)` runs **before** `fetchProfile` completes. Since `approved` defaults to `false`, the layout renders the pending screen before the profile data arrives.

Two places cause this:
1. **Line 69-75**: `fetchProfile` is called via `setTimeout` (deferred), but `setLoading(false)` runs immediately after on line 75
2. **Line 81-84**: `fetchProfile` is called but not awaited before `setLoading(false)` on line 84

## Fix — `src/contexts/AuthContext.tsx`

- In `onAuthStateChange`: do NOT set `setLoading(false)` when there's a user session until `fetchProfile` resolves. Call `fetchProfile` with `await` and set loading to false inside a `.then()` or after the await
- In `getSession`: await `fetchProfile` before calling `setLoading(false)`
- Remove the `setTimeout` wrapper around `fetchProfile` — it was likely added to avoid a Supabase deadlock warning, but we can handle that by keeping the `setTimeout` while still tracking when the profile is loaded (e.g., have `fetchProfile` set loading to false itself)

Concrete approach: have `fetchProfile` call `setLoading(false)` at the end, and remove the standalone `setLoading(false)` calls that happen before profile is loaded.

