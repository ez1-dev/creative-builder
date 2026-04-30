## Atualizar o Mapa para usar a UF de Destino

Hoje o Mapa de Destinos descobre o estado a partir do nome da cidade (`cidadesBrasil.ts`). Quando uma cidade não está no dicionário, ela cai no balde "sem geo" e não pinta o estado. A planilha enviada (`Relatório_Anual_Passagens_2026.xlsx`) traz uma coluna **UF DESTINO** explícita — vamos usá-la como fonte oficial.

### O que muda

1. **Banco de dados**
   - Nova coluna `uf_destino` (text, 2 chars) em `passagens_aereas`.
   - Validação leve: aceita apenas siglas UF maiúsculas ou nulo.

2. **Importação de XLSX**
   - `ImportarPassagensDialog.tsx` passa a aceitar a coluna `uf_destino` (e variações: `UF DESTINO`, `UF`, `uf`).
   - Modelo de importação (download) inclui a nova coluna.
   - Se a planilha não trouxer UF, o sistema tenta deduzir pelo dicionário de cidades no momento do insert (best-effort), mas não bloqueia a linha.
   - Linhas existentes continuam válidas (UF nula).

3. **Mapa de Destinos** (`MapaDestinosCard.tsx`)
   - Para cada passagem, a ordem de resolução do estado vira:
     1. `uf_destino` do registro (autoritativo)
     2. `geocodeCidade(destino)` (fallback atual)
   - Tooltip e contagem por estado passam a refletir a UF do registro, sem depender do dicionário.
   - Cidades sem coordenada continuam no badge "sem geo" só quando o Top 5 precisar plotar marcador, mas a coloração do estado já funciona com a UF crua.

4. **Dicionário de cidades**
   - Conferimos as 36 cidades da planilha enviada — todas já presentes em `cidadesBrasil.ts`. Nenhuma adição necessária por enquanto.
   - Mantemos um pequeno utilitário para detectar cidades futuras sem geo e logar no console (ajuda manutenção).

5. **UI (escopo restrito)**
   - Conforme combinado: a UF é interna, **não** aparece em formulário de cadastro nem em colunas de tabela.
   - Apenas o tooltip do mapa fica mais preciso.

### Detalhes técnicos

**Migration**
```sql
alter table public.passagens_aereas
  add column uf_destino text;

alter table public.passagens_aereas
  add constraint passagens_aereas_uf_destino_chk
  check (uf_destino is null or uf_destino ~ '^[A-Z]{2}$');
```

**Tipo `Passagem`** (em `PassagensDashboard.tsx`)
```ts
export interface Passagem {
  // ... campos atuais
  uf_destino: string | null;
}
```

**Resolução no mapa**
```ts
const ufResolvida =
  (r.uf_destino && /^[A-Z]{2}$/.test(r.uf_destino)) ? r.uf_destino
  : geocodeCidade(nomeNormalizado(r.destino))?.uf
  ?? null;
```

**Importação** — aceita header em qualquer dos formatos: `uf_destino`, `UF DESTINO`, `UF`. Normaliza para maiúsculas e valida 2 letras antes do insert.

### Arquivos afetados
- `supabase/migrations/<timestamp>_add_uf_destino.sql` (novo)
- `src/components/passagens/PassagensDashboard.tsx` (interface Passagem + select)
- `src/components/passagens/ImportarPassagensDialog.tsx` (parser + modelo)
- `src/components/passagens/MapaDestinosCard.tsx` (resolução de UF)
- `src/pages/PassagensAereasPage.tsx` (tipo do select Supabase, se necessário)
- `src/pages/PassagensAereasCompartilhadoPage.tsx` (mesmo ajuste no select público)

### Fora do escopo
- Não alteramos formulário de cadastro manual (UF continua interna).
- Não exibimos coluna UF na tabela nem no PDF/export.
- Não importamos automaticamente as 1258 linhas da planilha enviada — fica para um próximo pedido se você quiser.

Aprove para eu implementar.