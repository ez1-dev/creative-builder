## Objetivo

Na tabela de diferenças do **SGU › Preview por Campo**, adicionar uma nova coluna **"Descrição"** ao lado de **Campo**, exibindo o nome real (legível) do campo do ERP Senior (ex.: `NUMEMP` → "Número da Empresa", `TIPCOL` → "Tipo de Colaborador"). A coluna técnica `Campo` continua sendo exibida exatamente como hoje.

## Mudanças

### 1. Criar dicionário de campos do ERP

Novo arquivo `src/lib/erpFieldLabels.ts` contendo:

- Um mapa por tabela: `{ E099USU: { NUMEMP: 'Número da Empresa', TIPCOL: 'Tipo de Colaborador', ... }, R999USU: { ... }, ... }`
- Um fallback global para campos comuns do Senior (NUMEMP, TIPCOL, NUMCAD, NOMFUN, EMPATI, FILATI, etc.).
- Função `getFieldLabel(tabela: string, campo: string): string` que tenta tabela específica → fallback global → retorna `'—'` quando não houver mapeamento.

Cobertura inicial baseada nos campos vistos no preview e no padrão Senior:

```text
NUMEMP  → Número da Empresa
TIPCOL  → Tipo de Colaborador
NUMCAD  → Número do Cadastro
SUPTME  → Superior Imediato
COOCCU  → Código da Ocupação
INTNET  → E-mail (Internet)
EMPATI  → Empresa de Atividade
FILATI  → Filial de Atividade
GERAUS  → Gera Usuário (S/N)
FPGOBR  → Forma de Pagamento Obrigatório (S/N)
PSTATI  → Posto Atividade
NOMUSU  → Nome do Usuário
CODUSU  → Código do Usuário
SITCAD  → Situação do Cadastro
```

(Lista será preenchida com todos os campos E099USU/R999USU já tratados pelo backend; campos sem mapeamento mostram `—`.)

### 2. Atualizar `src/components/sgu/SguPreviewCamposTab.tsx`

- Importar `getFieldLabel`.
- Adicionar `<TableHead>Descrição</TableHead>` logo após `Campo` no cabeçalho.
- Adicionar `<TableCell>{getFieldLabel(d.tabela, d.campo)}</TableCell>` correspondente em cada linha.
- Atualizar `colSpan={7}` da linha "Nenhuma diferença..." para `colSpan={8}`.
- Incluir a descrição no blob de busca (`fBusca`) para permitir buscar por nome amigável também.

### Detalhes técnicos

- Não há mudança de backend. É apenas UI + um dicionário estático no frontend.
- `getFieldLabel` é case-insensitive em relação ao código do campo (`campo.toUpperCase()`).
- A coluna técnica `Campo` continua intacta (mesma fonte mono, mesmo valor cru).
- Caso o usuário queira no futuro, esse mesmo dicionário pode ser reaproveitado em outros pontos do SGU (detalhes do usuário, exports, etc.).

Aprova a implementação?