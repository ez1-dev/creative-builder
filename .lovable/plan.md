Remover o card **"Salário Base"** da grade de KPIs em `src/pages/rh/ResumoFolhaPage.tsx` (linha 351).

- Excluir apenas a linha `<KpiOrMissing title="Salário Base" ... />`.
- Manter a entrada `{ key: "salario_base", label: "Salário Base", format: "currency" }` (linha 290), pois ela é usada em contextos internos como composição/tooltip; se preferir remover também, informar.
- Nenhuma outra alteração.