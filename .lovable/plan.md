# Corrigir "Not authenticated" na tela DRE matriz

## Causa raiz
A nova `DrePage.tsx` faz `fetch(...)` direto em `/api/bi/contabilidade/dre-matriz` sem token. As demais telas funcionam porque usam o helper `api.get(...)` exportado em `src/lib/api.ts`, que:
- usa `getApiBaseUrl()`,
- adiciona `Authorization: Bearer <token ERP>` automaticamente a partir do `erp_token` em localStorage,
- inclui `ngrok-skip-browser-warning: true`,
- trata 401 com mensagem amigável.

Sem isso, o backend FastAPI responde `Not authenticated`.

## Mudanças em `src/pages/bi/contabilidade/DrePage.tsx`

1. Importar o helper compartilhado:
   ```ts
   import { api } from '@/lib/api';
   ```
   Remover `getApiUrl` se ficar sem uso.

2. Em `carregarDre`, substituir o bloco `fetch(url, ...)` por:
   ```ts
   try {
     const json = await api.get<any>('/api/bi/contabilidade/dre-matriz', {
       ano: pAno,
       unidade: unidadeParam ?? '',
     }, { keepEmpty: ['unidade'] });
     const linhas: DreLinha[] = Array.isArray(json)
       ? json
       : Array.isArray(json?.data) ? json.data : [];
     setLinhasRaw(linhas);
   } catch (e: any) {
     if (e?.statusCode === 401) {
       setErro('Sessão expirada. Faça login novamente.');
     } else {
       setErro(e?.message || String(e));
     }
     setLinhasRaw([]);
   } finally {
     setLoading(false);
   }
   ```
   Manter os `console.log` para acompanhamento.

3. Manter o bloco `rodarDiagnostico` (usa `supabase` do Cloud, não passa pelo FastAPI) e os `useEffect` existentes.

## Fora do escopo
- Não alterar a tela antiga.
- Não mexer em RPC, ETL ou backend.
- Não mudar layout.
