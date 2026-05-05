## Por que não está funcionando

O importador atual exige exatamente os headers do modelo padrão (`data_registro`, `colaborador`, `centro_custo`, `tipo_despesa`, `valor`, …). A planilha que você está enviando (`RELATORIO_CARTÃO_-_ABRIL.xlsx`) usa um layout totalmente diferente, vindo da rotina do cartão:

```
DATA | LOCAL | ITEM | CENTRO CUSTO | C.CUSTO | VALOR | NF | CARTÃO | VENC.
```

Como nenhum dos nomes esperados aparece, o parser considera todas as linhas inválidas (`colaborador vazio`, `tipo_despesa vazio`, `data_registro inválida`, `valor inválido`) e o botão "Importar" fica desabilitado.

Além disso, você quer trazer **só abril**, e hoje o diálogo não tem nenhum filtro de período.

## Plano (somente `src/components/passagens/ImportarPassagensDialog.tsx`)

1. **Mapeamento flexível de colunas (case/acento-insensível):**
   - `DATA` → `data_registro`
   - `LOCAL` → `colaborador`
   - `ITEM` → `motivo_viagem`
   - `CENTRO CUSTO` → `projeto_obra` (descritivo, ex. "OBRA 660")
   - `C.CUSTO` / `CCUSTO` → `centro_custo` (código)
   - `VALOR` → `valor`
   - `NF` → `numero_bilhete` (quando for "PASSAGENS" entra como observação)
   - `CARTÃO` → `fornecedor`
   - `VENC.` → ignorado
   - Mantém compatibilidade total com os headers atuais (`data_registro`, `colaborador`, etc.) — quem já usa o modelo continua funcionando.
   - Quando o `tipo_despesa` não vier na planilha, assume **"Aéreo"** (padrão para essa rotina; o usuário pode trocar depois pelo botão Editar).

2. **Filtro de mês/ano no diálogo:**
   - Adicionar dois selects "Mês" e "Ano" (default: mês/ano da maioria das datas do arquivo) com opção "Todos".
   - As linhas fora do período selecionado entram em uma quarta caixa "Ignoradas pelo filtro de período" (não contam como erro).
   - Para esse arquivo, basta deixar **Abril/2026** selecionado e só as 140 linhas do mês entram.

3. **Pré-visualização e contadores:**
   - Cards: Total | Válidas | Com erro | **Fora do período**.
   - Mostrar abaixo do nome do arquivo a faixa de datas detectada (ex. "Datas no arquivo: 01/04/2026 a 30/04/2026").

4. **Bug menor de console (`forwardRef` no DialogFooter):**
   - Envolver o `<Button asChild>` de "Baixar modelo" corretamente — sem efeito visível, só limpa o warning que aparece ao abrir o diálogo.

Sem alterações de banco, RLS, edge function nem em outras telas. KPIs, mapa, tabela e link público continuam idênticos.
