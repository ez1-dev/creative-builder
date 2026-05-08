# Plano

## Objetivo
Fazer a visualização compartilhada respeitar exatamente a disposição dos gráficos salva pelo administrador.

## O que vou ajustar
1. Corrigir a sincronização do grid de Passagens Aéreas para que, quando o layout vier do backend, o componente público atualize as posições/tamanhos renderizados em vez de continuar com o layout padrão em memória.
2. Preservar o comportamento atual do modo de edição, sem quebrar arraste, resize e salvamento do layout pelo administrador.
3. Validar o fluxo do link compartilhado sem senha e com senha para garantir que ambos usem a mesma disposição salva.

## Causa identificada
O hook de layout está carregando os widgets salvos do backend, mas o componente `PassagensLayoutGrid` só reinicializa seu `localLayout` quando muda o conjunto de tipos de widgets ou quando sai do modo de edição. Quando apenas as coordenadas `x/y/w/h` mudam (mesmos widgets, nova disposição), ele mantém em memória a versão anterior, que normalmente é a padrão.

## Implementação
- Atualizar a lógica de sincronização interna em `PassagensLayoutGrid.tsx` para detectar mudanças reais de layout vindas do backend no modo leitura/compartilhado.
- Fazer a ressincornização ser segura: no modo de edição, continuar preservando alterações locais; fora da edição, sempre refletir o layout persistido.
- Se necessário, ajustar a chave de comparação/sincronização para incluir geometria dos widgets, não apenas seus tipos.

## Validação
- Conferir se um layout salvo pelo administrador aparece igual ao abrir o link compartilhado.
- Conferir se links protegidos por senha continuam carregando o mesmo layout após a senha correta.
- Conferir que o editor continua permitindo arrastar/redimensionar e salvar normalmente.

## Detalhes técnicos
- Arquivo principal: `src/components/passagens/PassagensLayoutGrid.tsx`
- Possível verificação complementar: `src/pages/PassagensAereasCompartilhadoPage.tsx` e `src/hooks/usePassagensLayout.ts`
- Sem mudança de regra de negócio nem de banco; foco no consumo/renderização do layout salvo.