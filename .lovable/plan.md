## Status atual

O módulo **Impressão de Ordem de Produção** já foi criado no turno anterior em `/producao/impressao-op` com rota, sidebar (menu Produção), permissão em Configurações, hook de API, layout A4 com `JsBarcode`, CSS `@media print` e estados loading/erro/vazio.

Esta nova especificação é uma versão refinada do mesmo módulo. Em vez de recriar, vou ajustar o que já existe para bater 100% com o novo contrato.

## Ajustes a aplicar

### 1. Reduzir filtros (`ImpressaoOrdemProducaoPage.tsx`)
Manter apenas: **Empresa, Origem, Nº O.P., Listar Componentes (S/N), Listar Desenho (S/N), Estágio (cod_etg), Centro de Recurso (cod_cre)**.
Remover: Situação, Data de Geração, Agrupamento, Pasta de Desenhos, Cor Impressão CR.
A chamada passa a ser: `GET /api/producao/ordem-producao/impressao?cod_emp=…&cod_ori=…&num_orp=…&listar_componentes=…&listar_desenho=…&cod_etg=…&cod_cre=…`.

### 2. Atualizar tipos (`src/lib/producao/opImpressao.ts`)
- Renomear/adicionar no cabeçalho: `situacao_descricao` (mantém `situacao` como fallback).
- Em `OpOperacao`: adicionar `descricao_servico`.
- Em `ImpressaoOpFiltros`: enxugar para os 7 campos acima.

### 3. Ajustar layout (`OpPrintSheet.tsx`)
- **Cabeçalho à esquerda**: usar `cabecalho.codigo_barras_op` como `value` do barcode e como caption (texto abaixo) — em vez de concatenar `cod_ori + num_orp` no caption.
- **Centro**: linha de Situação passa a usar `situacao_descricao ?? situacao`.
- **Data Início Prev.**: formatar `inicio_previsto` como `dd/mm/yyyy` (helper local — sem mexer em lib).
- **Operações**: incluir linha "Serviço: {servico} {descricao_servico}" quando existir.
- **REV / Agrupamento**: já estão à direita — manter.
- Tudo o mais (componentes, apontamento manual 5 linhas, mensagem de responsabilidade, rodapé MCAP700.GER, barcodes Code128) já está conforme spec.

### 4. Componentes — barcode opcional
A spec menciona `codigo_barras_componente` "se for exibido". A tabela atual de componentes não mostra barcode por linha (manteria layout compacto). **Manter como está**, mas garantir que o tipo já contempla o campo (já contempla).

## Fora de escopo

- Sidebar, rota, permissão, screenCatalog e dependência `jsbarcode` já estão prontos — sem alterações.
- Nenhum mexido em backend, Cloud, RLS ou design system global.
- Botão "Gerar PDF" segue chamando `window.print()` (usuário salva como PDF no diálogo do navegador).

## Como validar

1. `/producao/impressao-op` → preencher Empresa=1, Origem=210, Nº O.P.=86993, Listar Comp.=S, Listar Desenho=N → **Consultar**.
2. Verificar que a URL chamada bate exatamente com o exemplo da spec.
3. Conferir cabeçalho (barcode + caption = `codigo_barras_op`, Situação usando `situacao_descricao`, data formatada `dd/mm/yyyy`).
4. Em uma operação com serviço, ver linha "Serviço: …".
5. Clicar **Visualizar Impressão** e depois **Imprimir** — somente a folha A4 deve sair, sem chrome do sistema.
