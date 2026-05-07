## Objetivo

Corrigir a classificação de **Projeto Macro** (Genius vs Estrutural Zortea vs Outros) em todo o sistema, garantindo que projetos com numero_projeto >= 600 sejam **ESTRUTURAL ZORTEA** e que GENIUS seja identificado por origens conhecidas ou nome contendo "GENIUS"/"GENI".

## Mudanças

### 1. `src/lib/comprasClassificacao.ts` (fonte única da regra)

Substituir `getProjetoMacro` pela nova lógica:

```ts
export type ProjetoMacro = 'GENIUS' | 'ESTRUTURAL ZORTEA' | 'OUTROS';

const GENIUS_ORIGENS = new Set([
  '110','120','130','135','140','150',
  '205','208','210','220','230','235','240','245','250',
]);

function parseNumeroProjeto(v): number|null { /* primeiro inteiro do valor */ }

export function getProjetoMacro(row): ProjetoMacro {
  // Aceita valor vindo do backend mas normaliza (Estrutural -> ESTRUTURAL ZORTEA, etc.)
  // 1) numero_projeto >= 600 -> ESTRUTURAL ZORTEA
  // 2) origem em GENIUS_ORIGENS -> GENIUS
  // 3) nome contém GENIUS/GENI -> GENIUS
  // 4) nome contém ESTRUTURAL/ZORTEA -> ESTRUTURAL ZORTEA
  // 5) caso contrário -> OUTROS
}
```

A regra **1 tem prioridade sobre 2-4** (qualquer 6xx é ESTRUTURAL ZORTEA, mesmo que a origem seja de GENIUS). Isso espelha exatamente o CASE proposto pelo usuário.

### 2. Rótulos do Select (Painel de Compras e Notas Recebimento)

`src/pages/PainelComprasPage.tsx` (linhas 814-817) e `src/pages/NotasRecebimentoPage.tsx` (linhas 423-426): trocar os `SelectItem` para os novos valores:
- `GENIUS`
- `ESTRUTURAL ZORTEA`
- `OUTROS`

Como os filtros comparam `d.projeto_macro !== filters.projeto_macro` e `d.projeto_macro` agora vem do `enrichRow` com o novo enum, o filtro continua funcionando.

### 3. Backend FastAPI

Não há acesso ao código do backend pelo Lovable. O frontend já trata o campo `projeto_macro` retornado pela API normalizando-o (ex.: `Estrutural` → `ESTRUTURAL ZORTEA`). Quando a API ainda devolver o valor antigo, o `enrichRow` re-classifica usando `numero_projeto` e `origem_material`, então mesmo sem mexer no backend o resultado fica correto.

Vou criar/atualizar `docs/backend-projeto-macro.md` com a regra SQL exata para o time de backend replicar quando puderem.

### 4. Áreas afetadas (já cobertas pelos pontos 1 e 2)

- **Filtros de Projeto Macro** — Selects atualizados.
- **KPIs / Gráficos / Drill-down** — Todos consomem `dadosEnriquecidos[].projeto_macro` (saída de `enrichRow`), portanto recalculam automaticamente.
- **Exportação Excel** — `getDadosExportacao()` usa `dadosFiltrados` (idem `enrichRow`), portanto refletirá os novos valores.
- **Demonstrativo Compras x Recebimentos** — Usa o campo do backend; basta normalização. Conferir o `<Select>` de filtro nessa tela e atualizar opções para os 3 novos valores.

### 5. Testes/validação manual

- Projeto 601 → ESTRUTURAL ZORTEA (mesmo se nome contiver GENIUS).
- Projeto 250 com origem 110 → GENIUS.
- Projeto 250 sem origem GENIUS e nome "Obra X" → OUTROS.
- Filtros, KPIs, drill e export reagem ao novo agrupamento.

## Não escopo
- Alterar backend FastAPI (sem acesso) — apenas documentação.
