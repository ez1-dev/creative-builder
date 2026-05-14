## Novo módulo: Manutenção de Máquinas

Vou criar o módulo **Manutenção de Máquinas** seguindo exatamente o mesmo padrão de **Manutenção de Frota** e **Passagens Aéreas** (Cloud-only, com importação Excel, dashboard configurável, share links públicos com senha e controle de permissão por perfil).

### 1. Backend (Lovable Cloud — migration)

**Tabela `manutencao_maquinas`** (espelho de `manutencao_frota`, adaptada às colunas da planilha enviada):

| Coluna             | Tipo      | Origem da planilha       |
|--------------------|-----------|--------------------------|
| `id`               | uuid PK   | —                        |
| `data`             | date      | DATA                     |
| `mes`              | text      | MÊS (auto pelo trigger)  |
| `fornecedor`       | text      | FORNECEDOR               |
| `descricao`        | text      | DESCRIÇÃO                |
| `quantidade`       | numeric   | QUANTIDADE               |
| `maquina`          | text      | MAQUINA                  |
| `tipo_maquina`     | text      | auto-classif. (ver §4)   |
| `ordem_compra`     | text      | ORDEM DE COMPRA          |
| `nota_fiscal`      | text      | NOTA FISCAL              |
| `valor`            | numeric   | VALOR                    |
| `centro_custo`     | text      | C.CUSTO                  |
| `observacoes`      | text      | —                        |
| `created_by/at`, `updated_at` | — | padrão                |

**Tabela `manutencao_maquinas_share_links`** — idêntica a `manutencao_frota_share_links`.

**Funções RPC** (cópias das de frota, trocando nome):
- `can_edit_maquinas`, `can_manage_maquinas_share`
- `validate_maquinas_share_token`, `get_maquinas_share_link_meta`, `get_maquinas_share_link_visuals`
- `get_maquinas_via_token`, `get_maquinas_layout_via_token`
- `create_maquinas_share_link`
- `upsert_maquinas_dashboard_default` (KPIs + gráficos canônicos)
- Trigger `normalize_maquinas_upper` (UPPER em maquina/tipo_maquina/centro_custo/fornecedor/descricao + auto-fill `mes`)

**RLS** — mesmo modelo de frota: leitura para quem tem `screen_path = '/manutencao-maquinas'` no perfil; insert/update/delete para `can_edit_maquinas`.

### 2. Frontend

Estrutura espelhada (`src/pages/ManutencaoMaquinasPage.tsx`, `ManutencaoMaquinasCompartilhadoPage.tsx`, `src/components/maquinas/MaquinasDashboard.tsx`, `ImportarMaquinasDialog.tsx`, `MaquinasShareLinksDialog.tsx`, `src/hooks/useMaquinasLayout.ts`).

**Dashboard widgets canônicos:**
- KPIs (Total gasto, Nº registros, Nº máquinas, Ticket médio, Top fornecedor)
- Evolução mensal
- Distribuição por **Tipo de máquina** e por **Máquina**
- Top máquinas por valor
- Top fornecedores
- Top centros de custo
- Tabela de registros (com remover/redimensionar colunas no padrão atual)

**Importação Excel** — aceita exatamente o cabeçalho da planilha enviada (DATA, MÊS, FORNECEDOR, DESCRIÇÃO, QUANTIDADE, MAQUINA, ORDEM DE COMPRA, NOTA FISCAL, VALOR, C.CUSTO).

### 3. Integração no app

- `src/components/AppSidebar.tsx` — novo item **Manutenção de Máquinas** (ícone `Wrench`), logo após **Manutenção de Frota**.
- `src/App.tsx` — rotas `/manutencao-maquinas` e `/manutencao-maquinas/share/:token`.
- `src/lib/screenCatalog.ts` — `MAQUINAS` / "Manutenção de Máquinas".
- `src/lib/visualCatalog.ts` — grupo "Manutenção de Máquinas" com as chaves visuais.
- Cadastro automático da tela em `profile_screens` para o perfil Administrador.

### 4. Carga inicial

Importo as **232 linhas** do arquivo enviado já no momento do deploy, com auto-classificação de `tipo_maquina` por palavra-chave da coluna MAQUINA:

- **Ponte Rolante** — contém "PONTE"
- **Laser / Corte** — "LASER", "PLASMA", "CORTE"
- **Solda** — "SOLDA", "MIG", "TIG"
- **Compressor** — "COMPRESSOR"
- **Empilhadeira** — "EMPILHADEIRA"
- **Pintura** — "PINTURA", "CABINE"
- **Serra** — "SERRA"
- **Outros** — fallback

(Você poderá ajustar/renomear depois direto na tela.)

### Fora de escopo

- Não toco em Frota nem Passagens.
- Sem novo gateway de IA — reusa os componentes BI existentes.
- Backend FastAPI externo: não precisa de mudança (módulo é 100% Cloud, igual Frota/Passagens).

Confirma que posso seguir? Se quiser, antes de implementar respondo 2 dúvidas rápidas:
1. Nome da rota: **`/manutencao-maquinas`** ou prefere **`/maquinas`** (curto, igual `/frota`)?
2. Quer que eu já importe os 232 registros da planilha agora, ou prefere começar com a tabela vazia e importar pela tela depois?
