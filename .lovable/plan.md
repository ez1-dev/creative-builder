## Ajuste na coluna NF — Auditoria Revenda (Faturamento Genius)

Editar apenas `src/components/faturamento/AuditoriaRevendaTab.tsx`. Sem mudança de endpoint, sem Supabase, sem migrations.

### 1. Mapeamento resiliente da NF
Adicionar helper local:
```ts
const getNF = (r: AuditoriaRevendaItem) =>
  r.documento_nf || r.numero_nf || r.nf || r.id_nf || r.num_nfv || '';
```
Estender a interface `AuditoriaRevendaItem` com os campos opcionais `documento_nf`, `numero_nf`, `id_nf`, `num_nfv` (todos `string | number | null`).

A coluna `NF` passa a usar `render: (_v, row) => getNF(row) || '-'` em vez de ler `row.nf` direto.

### 2. Reduzir colunas da tabela
Manter exatamente, nesta ordem:

`Origem · Data Emissão · Pedido · NF · Série NF · Item NF · Cliente · Projeto · Produto · Derivação · Revenda · Motivo`

Remover do `cols` atual: `Empresa`, `Filial`, `Ano/Mês`, `Código Cliente`, `Tipo Pendência`. KPIs e filtros permanecem inalterados.

### 3. Demais usos de `row.nf`
Não há outros pontos no componente lendo `row.nf` (export usa endpoint backend, sem montar linhas no front). Nada mais a alterar.

### Arquivos afetados
- `src/components/faturamento/AuditoriaRevendaTab.tsx` (único)
