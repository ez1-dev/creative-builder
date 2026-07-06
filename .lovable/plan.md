## Incluir telas de RH em Permissões por Tela

Hoje as telas de RH não aparecem em `Configurações → Permissões por Tela` porque a lista `ALL_SCREENS` em `src/pages/ConfiguracoesPage.tsx` não contém as rotas `/rh/*`, e o painel `PermissoesPorTelaPanel` não tem um módulo "RH" para agrupá-las.

### Mudanças

1. **`src/pages/ConfiguracoesPage.tsx`** — adicionar ao array `ALL_SCREENS` (usando os mesmos rótulos do `screenCatalog.ts`):
   - `/rh` — RH (índice)
   - `/rh/resumo-folha` — RH — Resumo Folha
   - `/rh/quadro-colaboradores` — RH — Quadro de Colaboradores
   - `/rh/contrato-experiencia` — RH — Contrato Experiência
   - `/rh/programacao-ferias` — RH — Programação de Férias
   - `/rh/turnover` — RH — Rotatividade / Turnover
   - `/rh/absenteismo` — RH — Absenteísmo / Afastamentos
   - `/rh/formularios` — RH — Formulários
   - `/rh/relatorio-gerencial` — RH — Relatório Gerencial (PDF+IA)

2. **`src/components/configuracoes/PermissoesPorTelaPanel.tsx`** — criar módulo próprio para RH:
   - `ModuleKey`: adicionar `'rh'`
   - `MODULE_LABEL.rh = 'RH'`
   - `MODULE_ORDER`: incluir `'rh'` (posição após `relatorios`)
   - `getModule`: se `path.startsWith('/rh')` → `'rh'`

Sem mudanças de backend/RLS. Os registros em `profile_screens` são criados sob demanda pelo `onToggle` existente quando o admin ativar cada permissão.
