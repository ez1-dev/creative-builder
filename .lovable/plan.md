## Diagnóstico

O modal "Nova versão disponível" reaparece em loop porque o `UpdateNotifier` compara duas fontes que estão dessincronizadas:

- `package.json → version` (compilado no bundle): **`1.0.0`**
- `app_settings.app_version` (no banco): **`1.0.3`**

Como `1.0.0 !== 1.0.3`, toda vez que o LocalStorage é limpo (modo anônimo, outro navegador, cookies limpos, etc.) o modal volta a aparecer. Clicar em "Atualizar agora" só recarrega a página — o bundle continua sendo `1.0.0`, então o modal volta no próximo poll (60s) sempre que o LocalStorage não tiver `app:last_seen_version=1.0.3`.

## Correções

### 1. Sincronizar `package.json` com a versão publicada
Atualizar `package.json` → `"version": "1.0.3"` para bater com `app_settings.app_version`. Isso faz `CURRENT_VERSION === remote` e o modal nunca mais é exibido enquanto não houver release nova.

### 2. (Defesa em profundidade) Persistir baseline também quando `remote === CURRENT_VERSION`
Pequeno ajuste em `src/components/UpdateNotifier.tsx` para gravar `LS_LAST_VERSION = remote` mesmo quando já está atualizado, evitando flicker em sessões novas.

### 3. Processo daqui para frente
Toda vez que mudar `app_settings.app_version` no banco para anunciar uma release, também subir o `version` do `package.json` no mesmo deploy. Caso contrário o loop volta.

## Validação
1. Abrir `/login` (ou qualquer rota) em aba anônima.
2. Aguardar 60s — o modal **não deve** mais aparecer.
3. Conferir no console: nenhum aviso recorrente sobre versão.

## Observação
Nenhuma alteração de banco é necessária. A correção é exclusivamente no `package.json` (1 linha) + ajuste opcional no `UpdateNotifier`.
