## Objetivo

Na aba **Sessões Senior** do Monitor de Usuários Senior, agrupar as linhas por **Usuário Senior**, mostrando uma única linha por usuário e, ao expandir, exibir uma sub-árvore com cada módulo/sessão acessada por ele. Isso elimina a repetição do mesmo usuário em várias linhas.

## Mudanças

**Arquivo único:** `src/pages/MonitorUsuariosSeniorPage.tsx`

### 1. Estrutura de agrupamento

Criar `grouped` (via `useMemo`) a partir do `sorted`:
```
{ usuario, totalSessoes, totalMinutos, computadores: Set, modulos: Set, sessoes: SessaoSenior[] }
```
Chave de agrupamento: `usuario_senior` (fallback `'(sem usuário)'`).

### 2. Estado de expansão

`const [expanded, setExpanded] = useState<Set<string>>(new Set())` + helper `toggleExpand(usuario)`.
Botão "Expandir todos / Recolher todos" no toolbar (ao lado da busca rápida).

### 3. Nova tabela em árvore

Substituir o `<TableBody>` atual por renderização agrupada:

- **Linha-pai** (uma por usuário):
  - Coluna 1: chevron (`ChevronRight` / `ChevronDown` do lucide-react) + nome do usuário em negrito
  - Badge com `totalSessoes` ("3 sessões")
  - Computador(es) distintos (concatenados ou contagem se >1)
  - Módulos distintos (contagem; primeiro nome + "+N")
  - Soma de minutos (com mesma lógica de cor: >240 destructive, >120 secondary)
  - Coluna Ações: vazia na linha-pai (ações ficam por sessão)
  - Linha clicável inteira para expandir
  
- **Linhas-filho** (renderizadas só quando expandido):
  - Indentação visual (pl-8 + borda-l)
  - Mostram colunas detalhadas: Sessão (numsec), Usuário Windows, Computador, Aplicativo, Cód. Mód., Módulo, Conexão, Min., Instância, Tipo Aplic., Mensagem Admin
  - Botão "Desconectar" individual (mantém comportamento atual — `openConfirm(s)`)

Ajustar cabeçalhos para refletir as novas colunas resumidas (linha-pai) — usar `colSpan` adequado ou manter mesmo grid e deixar células vazias na linha-pai.

### 4. Ordenação e filtros

- Filtros existentes (Usuário/Computador/Módulo/Aplicativo/quickSearch) continuam aplicados ANTES do agrupamento.
- Ordenação por `usuario_senior` ordena os grupos; ordenação por `numsec`/`modulo` ordena dentro de cada grupo.
- Contador do toolbar passa a mostrar: `{N usuários · M sessões}`.

### 5. CSV export

Mantém o formato atual (linha por sessão) — não alterar.

## Fora de escopo

- Aba "Navegação ERP Web" — não muda.
- KPIs — não mudam.
- Endpoint backend — não muda.
- Modal de desconexão individual e "Aplicar regras agora" — sem alteração.
