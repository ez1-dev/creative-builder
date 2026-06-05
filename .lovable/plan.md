Adicionar um campo de texto no popover de cor de fundo da `/bi/comercial` para o usuário digitar/colar um código hex (ex.: `#dd4444`) diretamente, além dos swatches e do color picker nativo já existentes.

## O que muda

No `Popover` do botão "Cor da página" (em `src/pages/bi/ComercialPage.tsx`):

1. **Novo campo de texto** abaixo do color picker nativo:
   - `<Input>` com placeholder `#dd4444`
   - Aceita formatos `#RGB`, `#RRGGBB`, `#RRGGBBAA`
   - Validação: aplica somente quando o valor casa com regex `^#[0-9a-fA-F]{3,8}$`
   - Botão "Aplicar" ao lado (ou aplica no `Enter` / `onBlur`)
   - Mostra mensagem discreta de erro se o valor for inválido

2. **Sincronização bidirecional**:
   - Ao escolher cor pelos swatches ou pelo color picker nativo, o campo de texto reflete o hex atual
   - Ao digitar um hex válido, o color picker nativo e o preview do botão também atualizam

3. **Persistência**: continua usando `setBgOverride(unidade, color)` no `localStorage` — sem mudanças em `comercialTheme.ts`.

## Escopo (NÃO mexer)

- Sem alterações em outras páginas, no tema global, ou no backend
- Sem alterações nas cores `primary`/`accent`/badges/gráficos — só o `pageBackground`
- Color picker nativo e swatches sugeridos continuam existindo

## Arquivos

- `src/pages/bi/ComercialPage.tsx` — adicionar `Input` de hex + estado local de validação dentro do `PopoverContent` já existente
