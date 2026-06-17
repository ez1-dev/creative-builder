## Diagnóstico

`DrePage` tem 3 problemas que juntos causam lentidão e "sumiço" de valores ao trocar filtros:

1. **Sem AbortController.** A cada mudança de `ano/unidade/mes_ini/mes_fim` dispara um novo `fetch` para `/api/bi/contabilidade/dre-matriz`, mas o anterior continua rodando. Se a resposta antiga chegar depois da nova, sobrescreve `linhasRaw` com dados errados ou vazios.
2. **`useEffect` sem debounce.** Mudar mês inicial e mês final em sequência dispara 2 requisições; o handler `handleMesInicialChange` ainda pode chamar `setMesFinal` no mesmo ciclo, gerando uma terceira.
3. **Limpa estado antes de receber.** No início de `carregarDre` o componente fica em `loading=true` mantendo `linhasRaw`, mas em qualquer erro/abort o `catch` faz `setLinhasRaw([])`, então ao trocar de página/filtro a tabela "esvazia" enquanto carrega.

A matriz em si pode demorar do lado do backend, mas o sintoma "sai quando troca de página" é causado por race + reset agressivo no front.

## Correções (somente frontend, só `src/pages/bi/contabilidade/DrePage.tsx`)

### 1. AbortController por requisição
- `carregarDre` cria um `AbortController` local e guarda em `useRef`.
- Antes de iniciar nova chamada, chama `abort()` no controller anterior.
- Passa `signal` para o `fetch`.
- No `catch`, ignora `AbortError` (não seta `erro` nem zera linhas).
- `useEffect` de cleanup chama `abort()` ao desmontar.

### 2. Debounce do disparo automático
Trocar:
```ts
useEffect(() => { carregarDre(); }, [ano, unidade, mesInicial, mesFinal]);
```
por um `setTimeout` de ~250 ms (cancelado no cleanup) para coalescir múltiplas mudanças de filtro em uma única requisição.

### 3. Manter dados anteriores durante o load
- No início de `carregarDre`: apenas `setLoading(true)` + `setErro(null)`. **Não** mexer em `linhasRaw`.
- No `catch` real (não-abort): `setErro(...)` mas **não** fazer `setLinhasRaw([])` — preservar a última matriz válida; a UI já mostra `erro` em destaque.
- Só substituir `linhasRaw` após sucesso confirmado.

### 4. Indicador "atualizando" sem ocultar a tabela
A renderização já trata `loading` mostrando uma linha "Carregando...". Ajustar para, quando já existir `linhasRaw.length > 0`, manter a tabela visível e exibir um badge/spinner discreto no header ("Atualizando..."). Sem mudança de layout.

## Fora de escopo

- Não tocar no backend (`/api/bi/contabilidade/dre-matriz` continua igual).
- Não mexer no drill, nas regras de classificação, nem em outras páginas.
- Não alterar contratos nem tipos compartilhados.
