

# Fix: Case mismatch on user_login query

## Problem
The `useUserPermissions` hook queries `user_access` with the `usuario` value from `AuthContext`, which stores it as `"RENATO"` (uppercase, as returned by the ERP API). However, the database record was inserted with `user_login = 'renato'` (lowercase). The query returns no results, so permissions are empty and "Configurações" is hidden.

## Solution
Two changes to make it robust:

### 1. Update the database record
Run a migration to update the existing record to uppercase `RENATO`, matching what the ERP API returns.

### 2. Make the hook case-insensitive
In `useUserPermissions.ts`, convert `usuario` to uppercase before querying (or use `.ilike`). This prevents future mismatches. The simplest approach: query with `user_login` compared case-insensitively using `.ilike('user_login', usuario)` instead of `.eq('user_login', usuario)`.

## Files changed
- `src/hooks/useUserPermissions.ts` — change `.eq('user_login', usuario)` to `.ilike('user_login', usuario)`
- Database migration — update existing record: `UPDATE user_access SET user_login = UPPER(user_login);`

