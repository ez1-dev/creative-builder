## Restaurar widget "Top destinos por valor"

Esse card existia antes (`MapaDestinosCard.tsx`, removido no commit fd6d96b junto com o mapa) e ranqueia as cidades de destino por valor total, com badge de valor, contagem de passagens e botão "Mostrar mais". Vou trazer só o card (sem o mapa) e integrá-lo ao dashboard de Passagens como um bloco individual, editável/oculto/redimensionável como os demais.

### Passos

1. **Recriar componente** `src/components/passagens/MapaDestinosCard.tsx` exatamente como o original (já contém toda a lógica de agregação por cidade, geocoding e UI ranqueada igual à imagem).

2. **Catálogo de visuais** (`src/lib/visualCatalog.ts`)
   - Adicionar entrada `passagens.chart-top-destinos-valor` → `'Gráfico: Top Destinos por Valor'`.

3. **Layout default** (`src/hooks/usePassagensLayout.ts`)
   - Adicionar widget `chart-top-destinos-valor` no `PASSAGENS_DEFAULT_WIDGETS`, posicionado logo após `chart-top-uf` (ex.: `position: 6`, `y: 27`, `w: 6`, `h: 10`), e empurrar `tabela-registros` para baixo.

4. **Migration** (`supabase/migrations/...`)
   - Atualizar `upsert_passagens_dashboard_default()` para incluir o novo bloco com o mesmo layout default, mantendo idempotência (usuário pode ter layout salvo — apenas insere se não existir).

5. **Dashboard** (`src/components/passagens/PassagensDashboard.tsx`)
   - Importar `MapaDestinosCard`.
   - Adicionar entrada no map de blocos:
     ```ts
     ...(canSeeVisual('passagens.chart-top-destinos-valor') ? {
       'chart-top-destinos-valor': (
         <MapaDestinosCard
           data={filteredData}
           selectedDestino={selectedDestino}
           onSelectDestino={(c) => toggleSelection(setSelectedDestino, c)}
         />
       ),
     } : {})
     ```
   - O bloco entra automaticamente no `PassagensLayoutGrid`, herdando edição individual, ocultar/restaurar e redimensionar.

### Observações

- **Não** vou trazer de volta o mapa/coropleto (`MapaCidadesViagens`, `BrazilChoroplethMap`, `geo/brasil-uf.json`) — apenas o card de ranking que aparece na imagem.
- Reaproveita `cidadesBrasil.ts` (já existe no projeto).
- Usuários com layout já salvo verão o bloco aparecer ao final do grid (a migration garante isso); admins podem reposicioná-lo via "Editar layout".
- Clicar num destino continua aplicando o filtro cruzado (`selectedDestino`), mantendo coerência com o gráfico "Top 10 Cidades de Destino".