## Objetivo
Adicionar a tela **Relatório Executivo de Faturamento** (`/bi/faturamento/relatorio-executivo`) ao sistema de permissões, para que cada perfil possa liberá-la independentemente do BI Comercial.

## Hoje
- A rota existe em `src/App.tsx`, mas está protegida com `ProtectedRoute path="/bi/comercial"` — ou seja, herda a permissão de outra tela.
- A tela não aparece em `ALL_SCREENS` (`src/pages/ConfiguracoesPage.tsx`), então não pode ser configurada em Configurações → Permissões por Tela.
- Não está mapeada em `src/lib/screenCatalog.ts`, então o log de navegação mostra o path bruto.

## Mudanças

1. **`src/pages/ConfiguracoesPage.tsx`** — adicionar no `ALL_SCREENS`, dentro do grupo BI:
   ```ts
   { path: '/bi/faturamento/relatorio-executivo', name: 'BI - Relatório Executivo de Faturamento' },
   ```

2. **`src/App.tsx`** — trocar a proteção da rota para usar o próprio path:
   ```tsx
   <Route
     path="/bi/faturamento/relatorio-executivo"
     element={
       <ProtectedRoute path="/bi/faturamento/relatorio-executivo">
         <RelatorioExecutivoFaturamentoPage />
       </ProtectedRoute>
     }
   />
   ```

3. **`src/lib/screenCatalog.ts`** — registrar no `EXACT`:
   ```ts
   '/bi/faturamento/relatorio-executivo': { codigo: 'BI_FAT_REL_EXEC', nome: 'BI - Relatório Executivo de Faturamento' },
   ```

4. **`src/components/AppSidebar.tsx`** — confirmar que o item já será filtrado pelo `canView` do path correto (sem alteração de código se já usa a `url` do item; só validar).

## Fora de escopo
- Conceder a permissão automaticamente para perfis existentes (será feito pelo administrador na tela de Configurações).
- Mudanças na própria página do relatório, no hook de dados ou na geração do PPTX.