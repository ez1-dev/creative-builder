

# Fix: Conciliação EDocs not appearing in menu

## Problem
The menu item exists in the code (line 29 of AppSidebar.tsx). The issue is the **permissions system**: the `profile_screens` table needs a row for `/conciliacao-edocs` with `can_view = true` for your user profile. Without it, the permissions filter hides the menu item.

## Solution
Insert the missing screen permission into the `profile_screens` table via a database migration.

### Database migration
Insert a row for `/conciliacao-edocs` for **all existing profiles** so every user profile can see the new page:

```sql
INSERT INTO public.profile_screens (profile_id, screen_path, screen_name, can_view, can_edit)
SELECT id, '/conciliacao-edocs', 'Conciliação EDocs', true, true
FROM public.access_profiles
ON CONFLICT DO NOTHING;
```

This ensures every existing access profile gets visibility of the new page. No code changes needed — the sidebar and route already exist.

