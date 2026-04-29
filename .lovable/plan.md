## Importar Planilha — Passagens Aéreas

Adicionar fluxo de importação a partir do modelo `.xlsx` já gerado, na própria página `/passagens-aereas`.

### UX

- Novo botão no `PageHeader` (visível só para quem tem `canEdit`):
  - **Importar planilha** (ícone `Upload`), ao lado de "Compartilhar" e "Novo registro".
  - Botão secundário **Baixar modelo** dentro do diálogo (link para `/modelo-importacao-passagens-aereas.xlsx`).
- Abre `Dialog` "Importar Passagens Aéreas" com:
  1. Input de arquivo (`accept=".xlsx"`).
  2. Após selecionar: parse no cliente e mostrar **pré-visualização** (tabela com 5 primeiras linhas + total de linhas).
  3. Painel de **validação**: linhas válidas, linhas com erro (lista resumida: "Linha 7: colaborador vazio").
  4. Botões: **Cancelar** | **Importar N registros** (desabilitado se não houver válidos).
- Durante a importação: barra de progresso simples ("Importando 120/340...").
- Ao terminar: toast com resumo ("250 importados, 3 ignorados") e `load()` para refrescar a lista.

### Parsing

- Usar a lib `xlsx` (SheetJS) — adicionar via `bun add xlsx`.
- Ler aba **`Passagens`** (nome do modelo). Se não existir, usar a primeira aba.
- Headers esperados (linha 1, exatos do modelo):  
  `data_registro, colaborador, centro_custo, projeto_obra, fornecedor, cia_aerea, numero_bilhete, localizador, origem, destino, data_ida, data_volta, motivo_viagem, tipo_despesa, valor, observacoes`.
- Conversões:
  - Datas: aceitar serial Excel ou string `DD/MM/YYYY` / `YYYY-MM-DD` → normalizar para `YYYY-MM-DD`.
  - `valor`: aceitar número ou string com `R$`, separadores → `Number`.
  - `tipo_despesa`: validar contra `TIPO_DESPESA_OPTIONS`; se inválido, marcar erro.
- Validação por linha:
  - Obrigatórios: `colaborador`, `tipo_despesa`, `valor` (>= 0), `data_registro`.
  - Demais campos opcionais (vazio → `null`).

### Inserção no banco

- Inserir em **lotes de 100** com `supabase.from('passagens_aereas').insert([...])`.
- `created_by` = `auth.uid()` atual em cada registro.
- Erros de lote: continuar próximos lotes; acumular contagem para o toast final.
- Aproveita RLS já existente (admins inserem).

### Arquivos

- `src/components/passagens/ImportarPassagensDialog.tsx` (novo) — todo o fluxo (upload, parse, preview, insert).
- `src/pages/PassagensAereasPage.tsx` — adicionar estado `openImport`, botão "Importar planilha" no header, render do diálogo, e chamar `load()` ao concluir.
- `public/modelo-importacao-passagens-aereas.xlsx` — copiar o modelo já gerado para servir como download.
- `package.json` — dependência `xlsx`.

### Detalhes técnicos

- Sem mudanças no schema/Supabase.
- Componente usa apenas `Dialog`, `Input type="file"`, `Button`, `Table`, `Progress` (já existem em shadcn).
- Tudo client-side; sem edge functions.
