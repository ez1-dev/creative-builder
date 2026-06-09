## Refinamento `onClickMensal` em `src/pages/bi/ComercialPage.tsx`

### Alterações

1. **Helper de normalização** (módulo, fora do componente):
   ```ts
   const normalizeAnomes = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(0, 6);
   ```

2. **Ref do período aplicado** (dentro de `ComercialPage`, após `useComercialFilters`):
   ```ts
   const periodoTopoAplicadoRef = useRef<{ anomes_ini: string; anomes_fim: string }>({
     anomes_ini: filters.anomes_ini,
     anomes_fim: filters.anomes_fim,
   });
   ```
   Inicializa com o período base atual (não com `draft`, que pode estar editado).

3. **`aplicarFiltrosBase`** atualiza a ref antes/depois do `setBase`:
   ```ts
   const aplicarFiltrosBase = () => {
     setBase({ ...draft });
     periodoTopoAplicadoRef.current = { anomes_ini: draft.anomes_ini, anomes_fim: draft.anomes_fim };
   };
   ```

4. **`onClickMensal`** reescrito:
   - Coleta candidatos: `d.anomes_emissao`, `d.anomes`, `d.mes`, e `extractDrillCtx(d, 'MENSAL').anomes_emissao`.
   - `const anomes = normalizeAnomes(<primeiro candidato truthy>);`
   - Se vazio (6 dígitos não obtidos): fallback `applyCtxAsCrossFilter(extractDrillCtx(d, 'MENSAL'))` e sair.
   - Logs temporários:
     ```ts
     console.log('Clique mensal:', d);
     console.log('Anomes selecionado:', anomes);
     console.log('Base antes:', { anomes_ini: filters.anomes_ini, anomes_fim: filters.anomes_fim });
     ```
   - Toggle off: se `filters.anomes_ini === anomes && filters.anomes_fim === anomes`, restaurar `periodoTopoAplicadoRef.current` via `setBase(...)` e `removeDrill('anomes_emissao')`.
   - Caso contrário: `setBase({ anomes_ini: anomes, anomes_fim: anomes })` e `removeDrill('anomes_emissao')`.
   - Log final: `console.log('Base depois:', { anomes_ini: anomes, anomes_fim: anomes });`

5. **Sem alterações** em endpoints, contratos de API, `applyCtxAsCrossFilter`, ou nos demais handlers (`onClickMix`, `onClickEstado`, `onClickMapa`, `onClickRevenda`, `onClickObra`).

### Imports

- Adicionar `useRef` em `react` import se ainda não estiver presente.

### Acceptance criteria

- Clicar em uma barra mensal: período do topo passa a ser o mês clicado (KPIs, Meta, Diferença, % Atingimento e linha de Meta recalculam).
- Clicar de novo no mesmo mês: período volta ao último período aplicado no botão "Aplicar filtros" do topo (não ao `draft` em edição).
- Logs aparecem no console com `d`, `anomes`, base antes e depois.
- Demais cliques (estado, revenda, mix, obra) continuam inalterados.
