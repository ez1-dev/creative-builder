## Objetivo

Remover o texto hardcoded de Linux/Docker do banner "Pasta de desenhos inacessível" no diálogo de Diagnóstico de desenhos e passar a exibir o diagnóstico real vindo do backend Windows.

## Arquivo alterado

`src/pages/producao/ImpressaoOrdemProducaoPage.tsx` — apenas o bloco do banner de erro (linhas ~1639–1651), dentro do `Dialog` de Diagnóstico. Restante do diálogo (grid com `cod_emp`/`cod_ori`/`num_orp`/`cod_pro`, contagem, amostra, `candidatos_testados`) fica intocado.

## Mudanças no banner

1. Título continua: **"Pasta de desenhos inacessível no servidor."**
2. Se o backend retornar `diagData.observacao` (string), renderizar esse texto em vez do parágrafo fixo atual.
3. Se o backend retornar `diagData.pastas_candidatas` (array `{ caminho: string; acessivel: boolean }`), renderizar uma lista compacta abaixo da observação:
   - Cada item: ícone ✓/✗ (usando `CheckCircle2` verde / `XCircle` vermelho já disponíveis no lucide), seguido de `<code>{caminho}</code>`.
   - Rótulo: "Caminhos testados pelo backend".
4. Dica final (fallback e complemento) — sempre em Windows, sem menção a Linux/Docker/`/mnt/`:
   > Defina a variável `PASTA_DESENHOS_OP` no host Windows da API apontando para um caminho acessível — por exemplo `C:\Senior\Sapiens\Pasta de Desenho\02-JPG_OP` (local) ou `\\EZORTEA-SRVSENI\Senior\Sapiens\Pasta de Desenho\02-JPG_OP` (UNC).
5. Se `observacao` estiver ausente, exibir apenas o título + dica + lista (sem texto genérico Linux/Docker).

## O que NÃO muda

- Nenhuma alteração em `useImpressaoPdfJob.ts`, `opImpressaoPdfJob.ts`, backend, `.env`, guardas de URL, ou em qualquer outro banner (progresso, avisos, resumo de desenhos).
- Não alterar o restante do diálogo de diagnóstico (grid de metadados, `candidatos_testados`, amostra de desenhos).
- Não introduzir novas dependências.

## Tipos

Estender localmente (cast leve, já que `diagData` é `any` no componente) para incluir `observacao?: string` e `pastas_candidatas?: Array<{ caminho: string; acessivel: boolean }>`. Sem mudança de tipo global.

## Aceite

- Banner nunca cita Linux, Docker ou `/mnt/`.
- Quando o backend envia `observacao`, ela aparece literalmente.
- Quando envia `pastas_candidatas`, cada caminho aparece com indicador de acessível/inacessível.
- Dica final orienta configuração no Windows (caminho local ou UNC).
- Resto da tela idêntico.
