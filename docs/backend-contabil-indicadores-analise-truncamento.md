# Análise IA de Indicadores Contábeis — truncamento e `finish_reason`

## Contexto
A rota `GET /api/contabil/indicadores/analise/stream` (SSE) hoje termina, em
períodos maiores (>= 6 meses), com a narrativa cortada no meio de uma frase —
ex.: `"...positivo mas de magnitude pequena frente ao E"`. O front consome o
stream corretamente (buffer + `split('\n\n')` + flush do resto no `finally`),
então o corte vem do modelo atingindo `max_tokens`.

## Pedidos ao backend

### 1. Aumentar `max_tokens`
Elevar o limite da chamada ao LLM de ~1500 para **no mínimo 4096** tokens de
saída. A análise executiva completa fica em ~2.5k–3.5k tokens.

### 2. Emitir `finish_reason` no evento `done`
Hoje o front recebe:

```
event: done
data: {"chars": 2731}
```

Passar a incluir `finish_reason` vindo do provedor:

```
event: done
data: {"chars": 2731, "finish_reason": "stop"}   # ou "length"
```

- `"stop"` → concluído normalmente.
- `"length"` → cortado pelo limite de tokens.

O front já lê o campo (`AnaliseStreamDoneInfo.finish_reason`) e mostra um
alerta amarelo "Resposta cortada pelo limite do modelo" quando for `length`.
Também temos uma heurística de fallback (última palavra curta / sem
pontuação) para o caso do backend ainda não enviar o campo, mas ela é menos
confiável.

### 3. (Opcional) Continuação
Aceitar `?continuar=1&depois_de=<hash|posicao>` para gerar o restante da
narrativa a partir de onde parou, sem repetir o que já foi enviado. Isso
permitiria um botão "Continuar" real no front — hoje ele apenas re-gera.

## Compatibilidade
Nada quebra se o backend só entregar o item 1 e mantiver o `done` atual — o
front apenas usa a heurística. O ganho maior vem de combinar 1 + 2.
