# Adicionar filtro por Mês — Passagens Aéreas

## O que será feito
Incluir um novo filtro **Mês** (Select) no painel de filtros do dashboard `/passagens-aereas`, ao lado dos filtros já existentes (Colaborador, CC, Tipo, Data início, Data fim, Limpar).

## Onde
Arquivo: `src/components/passagens/PassagensDashboard.tsx`.

## Como

1. **Novo estado**: `filtroMes` (string, default `'todos'`).

2. **Lista de meses disponíveis** (memoizada): extrair `YYYY-MM` distintos de `data_registro` em `data`, ordenados crescentemente. Exibir no Select como `Jan/2026`, `Fev/2026`, etc.

3. **Lógica de filtragem**: dentro do `useMemo` que monta `filtered`, adicionar:
   ```
   if (filtroMes !== 'todos' && dr.slice(0, 7) !== filtroMes) return false;
   ```
   Incluir `filtroMes` nas dependências.

4. **UI**: ajustar o grid de filtros de `md:grid-cols-5` para `md:grid-cols-6`, adicionando o novo Select **Mês** (com opção "Todos") logo após o filtro **Tipo**.

5. **Botão Limpar**: incluir `setFiltroMes('todos')` no reset e considerar `filtroMes !== 'todos'` na condição `disabled`.

## Resultado esperado
Usuário pode rapidamente filtrar registros, KPIs e gráficos por um mês específico (ex.: Jan/2026, Fev/2026, Mar/2026), sem precisar preencher data início/fim manualmente.
