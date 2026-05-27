
## Objetivo

Trocar o alerta vermelho de erro por um aviso visualmente mais leve, em tom de "sistema em manutenção", para reduzir ansiedade do usuário quando o backend ERP estiver fora.

## Mudanças

**Arquivo:** `src/components/erp/ErpConnectionAlert.tsx`

1. Trocar o `variant="destructive"` por um estilo "warning/maintenance":
   - Usar tokens semânticos: borda e fundo em `warning` (amarelo/âmbar suave, já existente no design system — vide `AvisoErpBanner`), texto em `foreground`.
   - Ícone: substituir `AlertTriangle` por `Wrench` (lucide-react) para reforçar a ideia de manutenção.

2. Reescrever o copy:
   - **Título:** "Sistema em manutenção"
   - **Descrição:** "Estamos realizando uma manutenção na conexão com o ERP. Os dados podem aparecer desatualizados ou indisponíveis por alguns instantes. Já estamos trabalhando para normalizar — tente novamente em breve."
   - Remover a menção ao usuário ERP ("RENATO") e ao caminho de Configurações no caso geral, já que assusta o usuário comum.

3. Manter o caso `!erpUser` (usuário ERP não configurado) com mensagem técnica original, pois é um caso real de configuração que só admins resolvem — mas também em tom amarelo de "atenção" em vez de vermelho de erro.

4. Nenhuma mudança em `useErpReady` nem na lógica de detecção — só visual e textual.

## Fora de escopo

- Tentar reconectar automaticamente, página de status, ou diferenciar tipos de falha (timeout vs auth vs offline).
- Mostrar versão "técnica" para admin — todos veem o mesmo aviso de manutenção.
