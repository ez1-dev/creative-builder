

# Fix Excel Export Authentication

## Problem
The export uses `window.open(url, '_blank')` which opens the URL in a new browser tab. This approach:
1. Cannot send custom headers (`Authorization: Bearer`, `ngrok-skip-browser-warning`)
2. Relies on `access_token` as a query parameter, which the backend may not support

## Solution
Change `ExportButton` to use `fetch()` with proper headers, then trigger the file download programmatically via a Blob URL.

## Changes

**File: `src/components/erp/ExportButton.tsx`**

Replace `window.open()` with:
1. Call `fetch()` using the API's base URL + endpoint + params, including `Authorization: Bearer <token>` and `ngrok-skip-browser-warning` headers
2. Convert response to Blob
3. Create a temporary `<a>` element with `URL.createObjectURL(blob)` to trigger download
4. Add loading state and error handling with toast feedback
5. Extract filename from `Content-Disposition` header if available, fallback to `export.xlsx`

### Technical detail
```typescript
const handleExport = async () => {
  setLoading(true);
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
    });
    if (!response.ok) throw new Error('Erro ao exportar');
    const blob = await response.blob();
    // trigger download via temporary <a> tag
  } catch {
    toast.error('Falha ao exportar');
  } finally {
    setLoading(false);
  }
};
```

