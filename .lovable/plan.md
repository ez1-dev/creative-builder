

## Não há `[object Object]` real para corrigir

### Verificação feita agora
- **Console do preview**: 0 ocorrências de `[object Object]`.
- **Runtime errors**: nenhum.
- **Busca no código-fonte** (`src/**/*.{ts,tsx}`) pela string `[object Object]`: 0 resultados.
- **Tela `/auditoria-apontamento-genius`** (a única candidata, por ter arrays `apontamentos`): já renderiza tudo de forma estruturada — `apontamentos` é usado apenas como **contador numérico** (`agg.apontamentos += 1`) e `apontamentosDaOp` é iterado com `.map()` célula a célula no drawer da OP. Não há `{apontamentos}` ou `{row.detalhes}` cru em JSX.

Ou seja: o texto que você colou descreve um problema **hipotético** que não existe no projeto hoje. Se eu aplicar o "fix" sugerido (criar `renderValor()`, trocar `setDados(response)` por `setDados(response.data)`, etc.) eu vou **introduzir mudanças sem necessidade** e potencialmente quebrar o consumo atual da API, que já usa `api.get<T>(...)` tipado e retorna o objeto certo.

### O que eu preciso de você para agir
Me confirme **um** destes:

1. **Você está vendo `[object Object]` em algum lugar específico da UI agora.**
   → Me diga **qual rota** e **qual coluna/área da tela**, ou anexe um screenshot. Eu vou direto naquele componente.

2. **Você está vendo no console do navegador** (não na tela).
   → Abra o DevTools (F12) → aba Console → me cole o **stack trace** completo do warning, com o nome do componente.

3. **Era só um exemplo genérico que outra IA te mandou** e não está acontecendo de fato.
   → Então não há nada a fazer. Posso seguir para o próximo item da sua lista (ex.: continuar a integração do detalhe por movimento da OP 1005 / origem 110, que ficou aprovada anteriormente mas depende do backend retornar os campos `data_inicial/hora_inicial/data_final/hora_final`).

### Por que não vou aplicar o "fix preventivo"
- Adicionar um `renderValor()` defensivo em colunas que hoje renderizam string/número correto **não corrige nada** e suja o código.
- Trocar `setDados(response)` por `setDados(response.data)` **quebraria** o fluxo atual: `api.get` já desempacota o JSON; o que vai pra `setData` é o objeto `{ dados, resumo, total_registros, debug }` — exatamente o que o resto da página espera.
- Mudanças "por garantia" sem reproduzir o problema violam a regra de só editar o que tem causa identificada.

### Resultado
Aguardo sua confirmação (qual das 3 opções acima) antes de mexer em qualquer arquivo.

