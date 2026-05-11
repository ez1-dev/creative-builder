
# Módulo Manutenção de Frota

Criar um módulo novo, com a mesma arquitetura do **Passagens Aéreas**: tabela própria no Lovable Cloud, página única com cadastro/edição manual, importação por planilha, dashboard BI com filtros, controle de permissão por perfil e compartilhamento via link público.

## Campos do registro (baseado na planilha enviada)

| Campo | Tipo | Origem na planilha |
|---|---|---|
| `data` | date | Dia |
| `mes` | text (jan, fev…) | MÊS (derivado de `data`) |
| `placa` | text | Placa |
| `veiculo_descricao` | text | parte após o "-" da Placa (ex.: "CAMINHÃO IVECO STRALIS") |
| `fornecedor` | text | FORNECEDOR |
| `descricao` | text | DESCRIÇÃO |
| `quilometragem` | numeric (nullable) | QUILOMETRAGEM (KM) |
| `valor` | numeric | VALOR |
| `motorista` | text | MOTORISTA |
| `centro_custo` | text | C.CUSTO |
| `segmento` | text (FROTA/OBRA) | Segmento |
| `observacoes` | text | (opcional, manual) |
| `created_by`, `created_at`, `updated_at` | padrão | — |

Catálogos auxiliares (preencher conforme dados):
- **veículos** (placa única + descrição) — combobox no formulário.
- **motoristas** — combobox.
- **fornecedores** — combobox livre.

## Backend (Lovable Cloud)

Migração com:

1. Tabela `manutencao_frota` (campos acima) + índices em `data`, `placa`, `centro_custo`, `segmento`.
2. Tabela `manutencao_frota_share_links` (espelho de `passagens_aereas_share_links`).
3. RLS:
   - SELECT: admin **ou** usuário com `profile_screens.screen_path = '/frota'`.
   - INSERT/UPDATE/DELETE: `can_edit_frota(uid)` (admin ou `can_edit=true` na tela `/frota`).
4. Funções `SECURITY DEFINER` espelhando passagens:
   - `can_edit_frota`, `can_manage_frota_share`
   - `create_frota_share_link`, `validate_frota_share_token`, `get_frota_share_link_meta`, `get_frota_via_token`, `get_frota_layout_via_token`, `get_frota_share_link_visuals`
   - `upsert_frota_dashboard_default` (widgets canônicos).
5. Trigger `normalize_frota_upper` (placa, motorista e centro de custo em UPPER/trim).
6. Cadastro no `screenCatalog` (`/frota` → "Manutenção de Frota") e no `visualCatalog` (chaves dos gráficos).

## Frontend

Estrutura idêntica à `PassagensAereasPage`:

- `src/pages/ManutencaoFrotaPage.tsx` — header, filtros, dashboard, tabela e dialog de cadastro.
- `src/pages/ManutencaoFrotaCompartilhadoPage.tsx` — link público com token + senha.
- `src/components/frota/`:
  - `FrotaDashboard.tsx` — usa biblioteca BI (`@/components/bi`).
  - `ImportarFrotaDialog.tsx` — upload da mesma planilha (.xlsx) com pré-visualização e mapeamento.
  - `VeiculoCombobox.tsx`, `MotoristaCombobox.tsx` (padrão `ColaboradorCombobox`).
  - `ShareLinksDialog.tsx` (reuso/adaptação do de passagens).
  - `MapaDestinosCard.tsx` → não se aplica; substituir por gráficos de frota.
- Rotas em `src/App.tsx`: `/frota` (protegida) e `/frota/share/:token` (pública).
- Item no `AppSidebar` com ícone `Truck` (lucide-react).

### Dashboard (widgets canônicos)

KPIs: **Total gasto**, **Nº de manutenções**, **Ticket médio**, **Veículos atendidos**.

Gráficos:
- Evolução mensal (linha/barra).
- Top veículos por valor.
- Top fornecedores por valor.
- Distribuição por **Segmento** (FROTA × OBRA) — donut.
- Top centros de custo.
- Top motoristas por valor.
- Tabela de registros (com export PDF/Excel via componentes já existentes).

Todos os gráficos passam pelo `VisualGate` com chaves `frota.*` para serem controláveis por perfil.

### Importação da planilha

Mantém o layout enviado:
- Pula linha de cabeçalho.
- Converte `Dia` para `date`, deriva `mes` automaticamente.
- Faz split da `Placa` em `placa` (antes do "-") e `veiculo_descricao` (depois).
- Permite revisar e descartar linhas antes de salvar (igual `ImportarPassagensDialog`).

## Permissões

Adicionar `/frota` ao catálogo de telas em `Configurações` → "Telas por Perfil" para conceder acesso via `profile_screens` (admins sempre veem). Cadastrar entradas no `VISUAL_CATALOG` para liberar/ocultar gráficos por perfil ou por link público.

## Detalhes técnicos

- Hook `useFrotaData` (paralelo ao `useDashboardData`) consultando `manutencao_frota` direto via `supabase.from(...)` com filtros (período, placa, segmento, centro de custo, motorista, fornecedor).
- Reuso integral da biblioteca BI: `DashboardPage`, `KpiGrid`, `BarChartCard`, `DonutChartCard`, `RankingChartCard`, `DataTableBI`, `FilterBar`.
- Sem dependência de ETL/FastAPI — módulo 100% Cloud, igual passagens.

```
src/
  pages/
    ManutencaoFrotaPage.tsx
    ManutencaoFrotaCompartilhadoPage.tsx
  components/frota/
    FrotaDashboard.tsx
    ImportarFrotaDialog.tsx
    VeiculoCombobox.tsx
    MotoristaCombobox.tsx
    ShareLinksDialog.tsx
supabase/migrations/<timestamp>_frota.sql
```

## Perguntas antes de implementar

1. **Rota e nome**: posso usar `/frota` e o nome **"Manutenção de Frota"** no menu (ícone caminhão)? Ou prefere outro nome (ex.: "Frota EZM")?
2. **Compartilhamento público**: replicar o esquema de link com token + senha + visuais ocultáveis (igual passagens), ou o módulo será **interno apenas**?
3. **Importação**: além do upload da planilha .xlsx no mesmo layout enviado, quer também **cadastro manual** com formulário (igual passagens) — confirmo os dois?
4. **Catálogo de veículos**: criar tabela `frota_veiculos` (placa, descrição, ativo) para alimentar o combobox e padronizar nomes — ou deixar campo livre digitado por enquanto?

Posso responder/seguir com defaults sensatos (sim/sim/sim/sim) se preferir.
