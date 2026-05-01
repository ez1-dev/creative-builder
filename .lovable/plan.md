## Objetivo

Eliminar os rótulos no formato `(E099XXX.CAMPO)` da coluna **Descrição** em **SGU › Preview por campo**, completando o dicionário `src/lib/erpFieldLabels.ts` com os campos remanescentes das 8 tabelas E099* do Senior ERP.

## Contexto

Hoje o `getFieldLabel` já cobre os campos principais e usa fallback `(TABELA.CAMPO)` para mostrar lacunas. Vamos preencher essas lacunas com base nos nomes oficiais do dicionário Senior para as tabelas:

`E099USU`, `E099CPR`, `E099FIN`, `E099GCO`, `E099UCP`, `E099UDE`, `E099USE`, `E099UVE`

## Mudanças

### 1. `src/lib/erpFieldLabels.ts` — ampliar `BY_TABLE`

Adicionar/complementar mapeamentos por tabela com os campos típicos do Senior que ainda aparecem como `(TABELA.CAMPO)`:

- **E099USU** (parâmetros gerais do usuário)
  - `TIPCOL` Tipo de Colaborador, `NUMCAD` Cadastro do Colaborador
  - `EMPATI` / `FILATI` / `PSTATI` Empresa/Filial/Posto da atividade
  - `INDADM` Indicador Administrador, `INDMAS` Usuário Mestre
  - `INDLOG` Permite Login, `INDWEB` Acesso Web, `INDAPP` Acesso App
  - `INDREL` Acesso a Relatórios, `INDEXP` Permite Exportação
  - `DATEXP` Data de Expiração, `DIAEXP` Dias para Expiração de Senha
  - `INDSEN` Troca de Senha Obrigatória, `TENINV` Tentativas Inválidas
  - `LIBHOR` Libera fora de horário, `IDIUSU` Idioma do Usuário

- **E099CPR**
  - `INDACE` Indicador de Acesso, `LIMAPR` Limite de Aprovação
  - `MOEAPR` Moeda do Limite, `INDAPR` Aprovador

- **E099FIN**
  - `CODFOR` Fornecedor, `CODCLI` Cliente, `CODCFO` Cliente/Fornecedor
  - `CODBAN` Banco, `CODCCO` Conta Corrente, `CODFCO` Filial da Conta
  - `INDPAD` Padrão, `LIMVAL` Limite de Valor

- **E099GCO**
  - `CODPRJ` Projeto, `INDPAD` Grupo Padrão, `NIVPER` Nível de Permissão

- **E099UCP**
  - `NIVPER` Nível de Permissão, `DATINI` Data Inicial, `DATFIM` Data Final
  - `INDLAN` Permite Lançamento, `INDCON` Permite Consulta

- **E099UDE**
  - `INDPAD` Departamento Padrão, `NIVPER` Nível de Permissão
  - `DATINI` / `DATFIM` Vigência

- **E099USE**
  - `INDPAD` Empresa Padrão, `INDACE` Indicador de Acesso
  - `EMPATI` / `FILATI` Empresa/Filial de Atividade
  - `DATINI` / `DATFIM` Vigência

- **E099UVE**
  - `INDACE` Indicador de Acesso, `LIMVEN` Limite de Venda
  - `DESMAX` Desconto Máximo (%), `MOEVEN` Moeda

### 2. Ampliar `GLOBAL` com campos comuns adicionais

Para cobrir variações que aparecem em várias E099* sem precisar repetir em cada tabela:

- `INDADM` Indicador Administrador
- `INDMAS` Usuário Mestre
- `INDLOG` Permite Login
- `INDWEB` Acesso Web
- `INDAPP` Acesso App
- `INDREL` Acesso a Relatórios
- `INDEXP` Permite Exportação
- `INDLAN` Permite Lançamento
- `INDAPR` Indicador Aprovador
- `LIMAPR` Limite de Aprovação
- `LIMVAL` Limite de Valor
- `LIMVEN` Limite de Venda
- `DESMAX` Desconto Máximo
- `MOEAPR` / `MOEVEN` Moeda
- `DATEXP` Data de Expiração
- `DIAEXP` Dias para Expiração
- `INDSEN` Troca de Senha Obrigatória
- `TENINV` Tentativas Inválidas
- `LIBHOR` Libera fora de Horário
- `IDIUSU` Idioma do Usuário
- `NIVACE` Nível de Acesso

### 3. Manter fallback atual

`getFieldLabel` continua retornando `(TABELA.CAMPO)` quando não houver mapeamento, para permitir reportar lacunas remanescentes.

## Arquivo afetado

- `src/lib/erpFieldLabels.ts` (apenas expansão do dicionário; nenhuma mudança em UI ou backend)

## Validação

Abrir **Gestão SGU › Preview por campo**, gerar preview entre dois usuários e:
1. Confirmar que a coluna **Descrição** mostra nomes amigáveis na grande maioria dos campos.
2. Caso reste algum campo no formato `(TABELA.CAMPO)`, copiar a lista para uma rodada final de mapeamento com nomes oficiais do Senior.
