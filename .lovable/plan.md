## Tipo = Aéreo / Ônibus / Outros

O campo `tipo_despesa` (hoje "Folha de Campo, Demissão, ..." — que é semanticamente **motivo da viagem**, não tipo) passa a ter apenas três opções: **Aéreo**, **Ônibus**, **Outros**.

### Alterações

1. **`src/components/passagens/PassagensDashboard.tsx`** — substituir `TIPO_DESPESA_OPTIONS` por:
   ```ts
   export const TIPO_DESPESA_OPTIONS = ['Aéreo', 'Ônibus', 'Outros'];
   ```
   Isso já reflete automaticamente no filtro **Tipo** da barra de filtros (já usa `TIPO_DESPESA_OPTIONS`) e no cadastro/edição em `PassagensAereasPage.tsx` e validação do importador.

2. **Migração de dados (UPDATE no banco)** — atualizar todos os 300 registros existentes para `tipo_despesa = 'Aéreo'`:
   ```sql
   UPDATE public.passagens_aereas SET tipo_despesa = 'Aéreo';
   ```
   (executado via tool de insert/update, não via migração de schema)

3. **Default do formulário** — `PassagensAereasPage.tsx` já usa `TIPO_DESPESA_OPTIONS[0]`, então o default novo será 'Aéreo' automaticamente.

### Fora do escopo

- Não renomear a coluna `tipo_despesa` no banco.
- Não mexer no filtro "Motivo da Viagem" recém-criado.
- Não mexer em KPIs, agrupamentos ou exportações.
