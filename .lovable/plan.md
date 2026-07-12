## Objetivo

Estender o **Modo Apresentação** para mascarar **todos os dados sensíveis em todos os módulos** do sistema — não só BI Comercial. Um único clique no botão "Apresentação" deve transformar visualmente a aplicação inteira: nomes de clientes, revendas, fornecedores, colaboradores, motoristas, placas, documentos (CNPJ/CPF), valores monetários, quantidades sensíveis, títulos de obras/projetos, nome da empresa em cabeçalhos, e conteúdo de relatórios/exportações/links públicos.

## Estratégia: interceptação central + varredura por módulo

Em vez de instrumentar componente por componente manualmente (frágil e incompleto), combinar duas camadas:

### Camada 1 — Interceptação central de dados (nova)
Criar um "pipeline de mascaramento" que roda automaticamente sobre os dados antes de chegarem à UI:

1. **`useMaskedQuery` / `useMaskedData`** — wrapper sobre resultados de queries (React Query, fetch, Supabase) que, quando o modo está ativo, aplica `maskName`/`maskDoc`/`maskCurrency` recursivamente em objetos e arrays, usando um **schema de campos sensíveis por módulo** (mapa `tabela → { nomes: [...], docs: [...], moneys: [...] }`).
2. **`MaskingSchema`** central em `src/lib/demo/maskingSchema.ts` — catálogo declarativo cobrindo:
   - Comercial: cliente, revenda, produto, projeto, nota_fiscal, cnpj, cpf, vl_*, qt_*
   - Financeiro/DRE: fornecedor, cd_conta, descricao, vl_*
   - Frota: motorista, placa, veiculo_descricao, fornecedor, valor
   - Máquinas: maquina, fornecedor, descricao, valor
   - Passagens: colaborador, cidade origem/destino, valor
   - Produção/Programação: OP, cliente, produto
   - RH/Colaboradores: nome, matrícula, documento
   - Compras/Recebimentos: fornecedor, cliente, valor
3. **Determinístico via hash FNV-1a** já existente → mesmo original sempre vira mesmo fake dentro da sessão.

### Camada 2 — Instrumentação de UI residual
Onde texto vem hardcoded (títulos, breadcrumbs, cabeçalhos de tabela dinâmicos, tooltips, exportações CSV/PDF):
1. Envolver com `<DemoText/>` `<DemoMoney/>` `<DemoDoc/>` existentes.
2. Nome/logo da empresa em `AppLayout`, sidebar, header de relatórios e páginas públicas → usar `useBrand()`.
3. Exportações (CSV/XLSX/PDF) — aplicar mascaramento no `buildExport()` antes de gerar arquivo.
4. Links públicos de compartilhamento (Frota, Máquinas, Passagens) — respeitar `presentation_mode` do link + preferências do dono via RPCs `get_*_share_link_presentation` (já existem).

## Escopo por módulo (varredura completa)

```text
BI
  ├─ Comercial (já feito) — revisar cobertura
  ├─ Financeiro / DRE / Balanço
  ├─ Compras / Recebimentos
  └─ Faturamento / Metas
Operacional
  ├─ Frota  (dashboard + tabela + share link)
  ├─ Máquinas (dashboard + tabela + share link)
  ├─ Passagens Aéreas (dashboard + tabela + share link)
  └─ Produção / Programação / Sequenciamento
Cadastros
  ├─ Clientes / Revendas / Produtos / Fornecedores
  └─ Colaboradores / Centros de Custo / Projetos
Relatórios
  ├─ Builder de relatórios (dados + cabeçalho)
  └─ Exportações (CSV, XLSX, PDF)
Layout global
  ├─ Sidebar (nome da empresa, avatar/usuário)
  ├─ Header (breadcrumb, título de página)
  └─ Rodapé + selo "Modo Apresentação"
```

## Entregáveis

1. **`src/lib/demo/maskingSchema.ts`** — catálogo de campos sensíveis por origem/tabela.
2. **`src/lib/demo/applyMask.ts`** — função recursiva que recebe `(data, schemaKey)` e retorna dados mascarados quando o modo está ativo.
3. **`src/hooks/useMaskedQuery.ts`** — hook wrapper que aplica mascaramento em resultados React Query.
4. **Atualização de hooks de dados existentes** dos módulos (Frota, Máquinas, Passagens, Financeiro, Compras, Produção, Colaboradores, Cadastros) para passar por `applyMask` antes de retornar.
5. **Instrumentação de UI residual** com `<DemoText/>`/`<DemoMoney/>`/`<DemoDoc/>` onde a camada 1 não alcança (labels dinâmicos, títulos, tooltips).
6. **`useBrand()`** aplicado em: `AppLayout`, `AppSidebar`, headers de relatórios, páginas de compartilhamento público.
7. **Exportações** — wrapper `maskForExport(rows, schemaKey)` chamado em todos os pontos de export CSV/XLSX/PDF.
8. **Selo "Modo Apresentação"** fixo (já existe `DemoBadge`) — confirmar visibilidade em todas as rotas incluindo públicas.
9. **QA via Playwright** — script que ativa o modo, navega por todas as rotas principais e captura screenshots para verificação visual de que nenhum dado real vaza.

## Detalhes técnicos

- **Sem alterações de schema no banco** — todo mascaramento é client-side (o modo apresentação é visual, não de segurança de dados).
- **Performance** — `applyMask` só percorre objetos quando `presentationMode === true`; caso contrário retorna referência original (custo zero).
- **Compatibilidade com cache** — mascaramento roda **depois** do React Query, então cache continua com dados reais; alternar o toggle re-renderiza sem refetch.
- **Cross-filter / drill-down** — filtros continuam usando IDs/valores reais internamente; só o label exibido é mascarado. Mantém funcionalidade intacta.
- **Gráficos (Recharts)** — mascarar `name`/`label` de séries e eixos categóricos; valores numéricos passam pelo fator monetário quando aplicável.
- **Tabelas virtualizadas** — aplicar mascaramento no `accessor` da coluna via wrapper, não no dado bruto, para preservar sort/filter.

## Fora de escopo

- Não altera lógica de negócio, cálculos, permissões ou RLS.
- Não persiste dados fake no banco.
- Não muda comportamento quando modo está desligado.

## Validação final

Playwright: login → ativar Apresentação → visitar `/bi/comercial`, `/bi/financeiro`, `/frota`, `/manutencao-maquinas`, `/passagens-aereas`, `/producao/programacao`, `/relatorios`, `/cadastros/*` → screenshot cada tela → confirmar que nenhum nome/documento/valor real aparece.
