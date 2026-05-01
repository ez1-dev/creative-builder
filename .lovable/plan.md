## Objetivo

Eliminar os "—" na coluna **Descrição** da aba **SGU › Preview por campo**, ampliando o dicionário `src/lib/erpFieldLabels.ts` para cobrir todos os campos das tabelas E099* usadas pelo módulo SGU.

## Tabelas a cobrir

As 8 tabelas SGU já listadas em `TABELAS_E099` (`src/lib/sguApi.ts`):

`E099USU`, `E099CPR`, `E099FIN`, `E099GCO`, `E099UCP`, `E099UDE`, `E099USE`, `E099UVE`

## Mudanças

### 1. `src/lib/erpFieldLabels.ts` — expandir dicionário

**Ampliar o `GLOBAL`** com campos comuns que aparecem em quase todas as E099*:
- `CODUSU` Código do Usuário
- `NUMEMP` / `NUMFIL` Empresa / Filial
- `TIPUSU` Tipo de Usuário
- `BLOUSU` Usuário Bloqueado
- `INDPER` Indicador de Permissão
- `NIVPER` Nível de Permissão
- `INDACE` Indicador de Acesso
- `DATINI` / `DATFIM` Data Inicial / Final
- `OBSUSU` Observação do Usuário
- `INDPAD` Indicador Padrão
- `IDEEXT` Identificador Externo
- `CODCCU` Código do Centro de Custo
- `CODPRJ` Código do Projeto
- `CODFOR` Código do Fornecedor
- `CODCLI` Código do Cliente
- `CODFPG` Forma de Pagamento
- `CODTPT` Tipo de Título
- `CODNAT` Natureza
- `CODCFO` Cliente/Fornecedor
- `CODGRP` Grupo
- `CODDEP` Departamento
- `CODSEC` Seção
- `CODVEN` Vendedor
- `CODCPR` Comprador
- `CODESP` Espécie
- `CODFIL` Filial
- `CODFCO` Filial de Conta
- `CODCCO` Conta Corrente
- `CODBAN` Banco

**Adicionar mapas específicos por tabela** em `BY_TABLE`:

- **E099USU** — Parâmetros gerais do usuário SGU (mantém heranças do GLOBAL).
- **E099CPR** — Compradores autorizados: `CODCPR`, `INDPAD`.
- **E099FIN** — Restrições financeiras: `CODFPG`, `CODTPT`, `CODNAT`, `CODCCU`, `CODPRJ`.
- **E099GCO** — Grupos de contas: `CODGRP`, `CODCCU`.
- **E099UCP** — Usuário × Centro de Custo: `CODCCU`, `CODPRJ`, `INDACE`.
- **E099UDE** — Usuário × Departamento: `CODDEP`, `CODSEC`.
- **E099USE** — Usuário × Seção/Empresa: `NUMEMP`, `NUMFIL`, `CODSEC`.
- **E099UVE** — Usuário × Vendedor: `CODVEN`, `INDPAD`.

### 2. Fallback melhor que "—"

Quando ainda não houver mapeamento, em vez de mostrar `—`, mostrar o próprio código entre parênteses (ex.: `(E099UVE.XYZ)`), para o usuário identificar quais campos ainda faltam mapear e nos reportar.

Alterar `getFieldLabel` em `src/lib/erpFieldLabels.ts`:

```ts
return tabMap?.[key] ?? GLOBAL[key] ?? `(${tab}.${key})`;
```

Assim nenhum campo fica vazio e fica fácil identificar lacunas.

## Arquivos afetados

- `src/lib/erpFieldLabels.ts` (expandir GLOBAL + BY_TABLE + fallback)

Nenhuma mudança em UI ou backend é necessária.

## Validação

Após aplicar, abrir **Gestão SGU › Preview por campo**, gerar preview entre dois usuários e confirmar que:
1. Campos comuns (CODUSU, NUMEMP, TIPCOL...) mostram nome amigável.
2. Campos restantes mostram `(TABELA.CAMPO)` — caso apareçam, me reporta a lista para eu adicionar nomes oficiais.
