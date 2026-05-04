# Padronizar nome do colaborador em MAIÚSCULAS

## Problema
Em `/passagens-aereas` → aba Registros, o mesmo colaborador aparece duplicado quando foi cadastrado com caixa diferente (ex.: "Edgard Soares Amorim" vs "EDGARD SOARES AMORIM"), gerando dois grupos e somas separadas.

## Solução (3 frentes)

### 1. Banco — normalizar dados existentes (migration)
- `UPDATE public.passagens_aereas SET colaborador = upper(trim(colaborador))` para consolidar registros já cadastrados.
- Adicionar trigger `BEFORE INSERT OR UPDATE` em `passagens_aereas` que faz `NEW.colaborador := upper(trim(NEW.colaborador))`, garantindo que toda nova gravação fique normalizada (inclusive via importação ou edição futura).

### 2. Inserção (frontend)
- Em `src/pages/PassagensAereasPage.tsx` (criação manual) e `src/components/passagens/ImportarPassagensDialog.tsx` (importação em massa): aplicar `colaborador.trim().toUpperCase()` antes do insert.

### 3. Agregações (frontend, defesa em profundidade)
- Em `src/components/passagens/PassagensDashboard.tsx`:
  - Agrupamento por colaborador (mapa em `~linha 301`): usar `upper(trim)` como chave.
  - Contagem `colaboradoresUnicos` (linha 334): aplicar normalização no Set.
  - Filtro por colaborador (linha 191) e ordenações: comparar normalizado.
  - `ColaboradorCombobox` (lista de sugestões): deduplicar via versão maiúscula.

## Resultado
- "Edgard Soares Amorim" e "EDGARD SOARES AMORIM" passam a aparecer como um único colaborador "EDGARD SOARES AMORIM" com a soma correta (R$ 200,66 no exemplo).
- Não há mais como criar variações por caixa: trigger + frontend garantem consistência.

## Detalhes técnicos
- Migration única com: `UPDATE`, função `normalize_passagens_colaborador()` e trigger `passagens_aereas_normalize_colab`.
- Sem alterações no schema (mesma coluna `colaborador text`).
- Sem impacto em links de compartilhamento públicos (apenas leem dados).
