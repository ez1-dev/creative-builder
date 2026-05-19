## Objetivo

Criar a tela **Impressão de Ordem de Produção** dentro do menu **Produção**, reproduzindo o relatório Senior `MCAP700.GER`, consumindo `GET /api/producao/ordem-producao/impressao` e gerando impressão/PDF via navegador.

## Entregáveis

### 1. Nova rota e página
- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Rota `/producao/impressao-op` registrada em `src/App.tsx` com `ProtectedRoute`.
- Entrada no submenu **Produção** em `src/components/AppSidebar.tsx` (`producaoSubItems`), usando ícone `Printer` (lucide).
- Entrada em `ALL_SCREENS` (`src/pages/ConfiguracoesPage.tsx`) para permissão por perfil.
- Entrada em `src/lib/screenCatalog.ts`.

### 2. Filtros (topo, dentro de `FilterPanel`)
Campos: Empresa, Origem, Número da O.P., Situação, Data de Geração, Agrupamento, Listar Componentes (S/N), Listar Desenho (S/N), Pasta de desenhos, Operação (cod_etg), Cor Impressão CR (etg_cor), Centro de Recurso (cod_cre). Defaults vazios; só dispara fetch ao clicar **Consultar**.

### 3. Botões da barra
- **Consultar** — chama API com filtros.
- **Visualizar Impressão** — alterna visualização para "modo folha" (preview A4 na tela, sem chrome).
- **Imprimir** — `window.print()`.
- **Gerar PDF** — `window.print()` (usuário salva como PDF no diálogo do navegador). Mensagem informativa.
- **Limpar** — reseta filtros e estado.

### 4. Consumo da API
- Helper em `src/lib/api.ts` já existente (`api.get`). Novo hook: `src/hooks/useImpressaoOrdemProducao.ts` para encapsular fetch + estados `loading | error | data`.
- Endpoint: `GET /api/producao/ordem-producao/impressao` com todos os parâmetros listados.
- Tratamento padrão: header `ngrok-skip-browser-warning`, logging via `errorLogger`.

### 5. Layout de impressão A4 (componente `OpPrintSheet`)
Novo arquivo `src/components/producao/OpPrintSheet.tsx`. Estrutura fiel ao MCAP700.GER:

```text
┌──────────────────────────────────────────────────────────────┐
│ Origem/O.P.                              Página: 1/1         │
│ ║║║║║ barcode                                                │
│ cod_ori + num_orp(9)                                         │
│                                                              │
│ Origem: ...    Início Prev: ...    ┌──────┬──────────────┐   │
│ O.P.: ...      Pedido:     ...     │ REV  │ Agrupamento  │   │
│ Qtde: ...      Período:    ...     │  X   │     Y        │   │
│ U.M.: ...      Situação:   ...     └──────┴──────────────┘   │
│ Produto: ...                                                 │
├──────────────────────────────────────────────────────────────┤
│ Estágio: {cod_etg} {descricao}                               │
├──────────────────────────────────────────────────────────────┤
│ Relação de Componentes Necessários                           │
│ ┌─────┬───────────────┬──────────┬────┬─────┬───────────┐    │
│ │ Cód │ Descrição     │ Qtd Prev │ UN │ Dep │ Endereço  │    │
│ └─────┴───────────────┴──────────┴────┴─────┴───────────┘    │
├──────────────────────────────────────────────────────────────┤
│ Para cada operação:                                          │
│ ║║║║║ barcode                                                │
│ Estágio / Seq / CR / Operação / Fornecedor / Serviço         │
│ Tmp Unit / Tmp Total / U.M. / Próxima Operação               │
│ Narrativas                                                   │
├──────────────────────────────────────────────────────────────┤
│ Apontamento Manual (5 linhas em branco)                      │
│ Início | Fim | Qtd Produzida | Refugos | Operador | [ ]      │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Ao finalizar o apontamento o operador estará se          │ │
│ │ responsabilizando pela quantidade e qualidade...         │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ MCAP700.GER - Chão de Fábrica - {data/hora} - {usuário}      │
└──────────────────────────────────────────────────────────────┘
```

Códigos de barras renderizados com `jsbarcode` (já compatível) ou nova dep leve `react-barcode`. Usar `codigo_barras_op`, `codigo_barras_componente`, `codigo_barras_operacao` vindos da API como `value`.

### 6. Estados
- Loading: spinner + "Carregando ordem de produção..."
- Erro: caixa com mensagem retornada pela API + botão Tentar novamente.
- Vazio (sem `cabecalho`): "Ordem de produção não encontrada."

### 7. CSS de impressão
- Folha de estilo dedicada `src/components/producao/op-print.css` (importada só na página) com:
  - `@page { size: A4 portrait; margin: 8mm; }`
  - `@media print { .no-print { display:none !important } .op-sheet { ... } }`
  - Fonte `Arial, "Helvetica Neue", sans-serif`, tamanho 9–11px, bordas `1px solid #000`, sem cores.
  - `page-break-inside: avoid` em blocos de operação/componentes; `page-break-before: auto` para listas longas.
- Modo "Visualizar Impressão" aplica as mesmas regras na tela usando container `.op-sheet--preview` (largura 210mm, sombra leve).

### 8. Regras
- Frontend **não calcula** nada: usa os campos como vieram (`num_orp_formatado`, `produto_descricao`, totais, etc.).
- Para "5 linhas vazias" do apontamento manual: renderizadas estaticamente no template.
- Rodapé pega `new Date()` e `useAuth().user?.email` (ou nome do perfil).

## Detalhes técnicos

- Tipos TS em `src/lib/producao/opImpressao.ts` espelhando o JSON da API (`OpCabecalho`, `OpComponente`, `OpOperacao`, `OpImpressao`).
- Tokens do design system: tela em si (não impressão) usa tokens semânticos; folha impressa usa preto puro `#000` (exceção autorizada por ser relatório industrial monocromático).
- Sem alterações no backend FastAPI (já existente conforme spec do usuário).
- Sem alterações no Lovable Cloud / Supabase.

## Fora de escopo

- Geração de PDF server-side (usaremos `window.print()` → "Salvar como PDF" do navegador, conforme item 9 do briefing).
- Edição/apontamento real da OP — esta tela é apenas impressão.
- Cadastros novos para os filtros (usar autocompletes existentes quando aplicável; caso o endpoint de cadastro não exista, usar `Input` simples).

## Como validar

1. Liberar tela em **Configurações → Perfis** para o usuário de teste.
2. Acessar `/producao/impressao-op`, preencher Empresa + Nº O.P., clicar **Consultar**.
3. Conferir cabeçalho, componentes, operações e códigos de barras na tela.
4. Clicar **Visualizar Impressão** → ver folha A4 simulada.
5. Clicar **Imprimir** → diálogo do navegador sem menu/filtros/botões visíveis.
6. Salvar como PDF e comparar com `MCAP700.GER` Senior.
