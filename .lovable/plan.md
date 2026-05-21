## Objetivo
Na página `/producao/impressao-op`, ocultar o botão **"Testar diagnóstico"** (que chama `/api/producao/ordem-producao/desenhos/diagnostico`) para usuários comuns. Apenas o super administrador deve enxergar.

## Alterações

**`src/pages/producao/ImpressaoOrdemProducaoPage.tsx`**

1. Importar o hook de permissões:
   ```ts
   import { useUserPermissions } from '@/hooks/useUserPermissions';
   ```
2. Dentro do componente, obter `isAdmin`:
   ```ts
   const { isAdmin } = useUserPermissions();
   ```
3. Envolver o `<Button>` "Testar diagnóstico" (linhas 868–877) em condicional:
   ```tsx
   {isAdmin && (
     <Button ...>Testar diagnóstico</Button>
   )}
   ```

## Não alterar
- Lógica de `rodarDiagnosticoDesenhos` (mantida; só fica inacessível pela UI para não-admin).
- Dialog de resultado do diagnóstico.
- Demais controles da página, layout, impressão e carregamento de desenhos.

## Critério de "super admin"
Usar `isAdmin` do `useUserPermissions` — corresponde ao perfil de acesso `Administrador` no Lovable Cloud, mesmo padrão já adotado em outras telas restritas do projeto.
