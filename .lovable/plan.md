## Ajustes finos no mapeamento do grid Empresa

Depois do restart da 8070, o payload de `por_empresa` traz alguns nomes de campo que ainda não estão no alias do front. Sem esse ajuste as colunas continuarão "—" mesmo com dado chegando.

### Diferenças detectadas vs. `EMPRESA_KPI_ALIASES` atual

| Coluna do grid | API manda | Alias hoje cobre? |
|---|---|---|
| Aposent. Invalidez | `apos_invalidez` | Não (só `aposentadoria_invalidez`, `aposent_invalidez`, `aposentadoria`, `aposentados`, `invalidez`) |
| Licença Maternidade (nova) | `licenca_maternidade` | Coluna não existe no grid |
| Homens / Mulheres (novos) | `homens`, `mulheres` | Colunas não existem no grid |

Demais campos (`colaboradores`, `trabalhando`, `admitidos`, `demitidos`, `pcd`, `estagiarios`, `jovem_aprendiz`, `ferias`, `aux_doenca`, `acidente_trabalho`, `atestados`) já batem com os aliases atuais e devem preencher sozinhos.

`pickEmpresaMatriz` já aceita `label` como nome da empresa, então `por_empresa[].label` → coluna "Empresa" continua ok.

### Alterações

**`src/lib/rh/quadroDashboardApi.ts`**
1. `EMPRESA_KPI_ALIASES.aposentadoria_invalidez`: adicionar `"apos_invalidez"` no início da lista de aliases (mantendo os demais para retrocompatibilidade).
2. Adicionar três chaves opcionais em `QuadroEmpresaLinha`: `licenca_maternidade`, `homens`, `mulheres`.
3. Adicionar aliases correspondentes em `EMPRESA_KPI_ALIASES`:
   - `licenca_maternidade`: `["licenca_maternidade", "lic_maternidade", "maternidade"]`
   - `homens`: `["homens", "masculino", "qtd_masculino"]`
   - `mulheres`: `["mulheres", "feminino", "qtd_feminino"]`

**`src/pages/rh/QuadroColaboradoresPage.tsx`**
1. Grid Empresa: adicionar 3 novas colunas no header e no `<tbody>`/totais, nesta ordem no fim: `Licença Maternidade`, `Homens`, `Mulheres`.
2. Manter a mesma regra de "—" para valores ausentes e a linha de totais somando apenas numéricos.
3. Remover o aviso "Montagem Externa pendente de regra na API." se a linha vier no payload (comportamento já implementado — só confirmar).

### Fora de escopo

- Backend / FastAPI (usuário já confirmou que restart resolve os zeros).
- KPIs de topo, gráficos por_* e histórico (contrato bate com o que o front já lê).
- Recalcular Trabalhando / gerar Excel de conferência (usuário perguntou como próximo passo separado — respondo depois de aplicar isto).

### Validação

Após o restart da 8070 + este ajuste, com `data_ref=hoje`:
- Linhas ESTRUTURAL / GENIUS / MONTAGEM EXTERNA (se vier) preenchidas em todas as 14 colunas antigas + 3 novas.
- Aposent. Invalidez deixa de ser "—" quando `apos_invalidez` chegar.
- Totais somam corretamente as novas colunas.
