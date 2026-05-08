## Diagnóstico

A tela preta no app desktop (Electron) acontece porque o Vite está construindo o app com `base: '/'` (padrão). No navegador isso funciona, mas dentro do Electron o `index.html` é carregado via protocolo `file://`, e os caminhos absolutos como `/assets/index-xxx.js` não resolvem — o HTML carrega vazio (tela preta), enquanto a versão web continua normal. Isso bate exatamente com o sintoma: só quebra no desktop, e começou após uma nova build/instalador ser distribuída.

O `vite.config.ts` atual não define `base`, então qualquer rebuild gera os mesmos caminhos absolutos quebrados no Electron.

## Plano

1. Ajustar `vite.config.ts` para usar `base: './'`, gerando caminhos relativos compatíveis com Electron (`file://`) e mantendo o funcionamento normal no navegador e no preview Lovable.
2. Garantir que o roteamento client-side continue funcionando dentro do Electron (rotas internas como `/login` precisam ser tratadas pelo React Router e não pelo `file://`). Se necessário, documentar uso de `HashRouter` apenas no build desktop, ou um fallback no `main.cjs` do Electron — sem alterar o comportamento da versão web.
3. Após o ajuste, o usuário precisa **gerar um novo instalador** do Electron e redistribuir aos usuários — a build atualmente instalada continuará preta até ser substituída.

## Detalhes técnicos

- Arquivo alterado: `vite.config.ts` — adicionar `base: './'` no objeto retornado por `defineConfig`.
- Nenhum código de aplicação muda; é só configuração de build.
- Versão web publicada (`ez-erp-ia.lovable.app`) continua funcionando normalmente, pois caminhos relativos resolvem do mesmo jeito sob HTTP.
- Se houver `HashRouter` x `BrowserRouter`: manter `BrowserRouter` para web; se o Electron tiver problema de rota ao recarregar, alternativa segura é trocar para `HashRouter` apenas no build empacotado, mas só faço isso se o sintoma persistir.

## Validação após implementar

- Rodar uma nova build (`vite build`) e reempacotar o Electron.
- Abrir o instalador novo: a janela "Sapiens Control Center" deve mostrar a tela de login normalmente, sem ficar preta.
- Conferir no console do Electron (Ctrl+Shift+I) que não há mais erros 404 nos arquivos `assets/*.js` e `assets/*.css`.