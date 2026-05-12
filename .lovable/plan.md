## Tratar erro 422 no `VerCodigoLspDialog`

Enquanto o backend não reordena as rotas, exibir mensagem amigável quando `GET /api/senior/regras/codigo` retornar 422 (ou outros erros), em vez do toast genérico.

### `src/components/regras-senior/VerCodigoLspDialog.tsx`

1. Adicionar estado `const [erro, setErro] = useState<string | null>(null);`.
2. No `carregar()`, no `catch`:
   - Detectar 422 / `int_parsing` na mensagem do erro.
   - Quando for esse caso, setar `erro` para:
     > "O endpoint `/api/senior/regras/codigo` ainda não está disponível no backend. Peça ao time backend para registrar a rota antes de `/regras/{id_regra}` (ou tipar como `int`)."
   - Para outros erros, setar `erro` com a mensagem do erro original.
   - Não chamar `toast.error` aqui (o Alert já comunica).
3. Renderização: quando `!loading && erro`, mostrar `<Alert variant="destructive">` com `AlertTriangle`, título "Não foi possível carregar o código LSP" e o texto do `erro`. Esconder os botões de Copiar/Clonar/Importar e manter apenas **Voltar** e **Tentar novamente** (chama `carregar()` de novo).
4. Manter o fluxo `fonte_disponivel=true/false` inalterado quando a resposta vier 2xx.

### Fora de escopo

- Nenhuma alteração em `seniorApi`, `RegrasList`, `RegraNegocioPage`, `ImportarFonteLspDialog`, ou em backend/rotas.
- Não alterar comportamento do `toast` em outras telas.