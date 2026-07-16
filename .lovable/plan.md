## Remover "Em validação técnica" do card

**Arquivo:** `src/pages/rh/ResumoFolhaPage.tsx` (linha 370)

**Card afetado:** "Custo das Férias" — hoje mostra o rodapé "Em validação técnica" quando o usuário é admin e `data?.fonte === "public.rh_vm_folha"`.

**Alteração:** remover a prop `footer={...}` desse `<KpiOrMissing>`, mantendo todo o restante (título, valor, missing, drill) intacto.

Antes:
```tsx
<KpiOrMissing title="Custo das Férias" ... footer={isAdmin && data?.fonte === "public.rh_vm_folha" ? "Em validação técnica" : undefined} {...kpiDrill("custo_ferias")} />
```

Depois:
```tsx
<KpiOrMissing title="Custo das Férias" ... {...kpiDrill("custo_ferias")} />
```

Nenhuma outra alteração (sem mexer em backend, cálculo, cache ou outros cards).