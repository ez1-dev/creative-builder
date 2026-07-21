## Plano

1. **Corrigir a regra de exibição**
   - Remover o fallback que preenche **Usuário Origem** com `usuario` quando `usuario_origem` vem vazio.
   - Manter **Usuário Lcto.** usando `usuario_lancamento`, com fallback controlado para `usuario` apenas se o backend não enviar `usuario_lancamento`.

2. **Padronizar grid, modal e Excel**
   - Aplicar a mesma regra nas colunas da tabela, no detalhe do lançamento e na exportação.
   - Quando `usuario_origem` vier nulo/vazio, exibir vazio ou `—`, sem copiar o usuário do lançamento.

3. **Revisar destaque de divergência**
   - Manter o destaque âmbar somente quando `usuario_origem_difere === true`.
   - Ajustar tooltip/banner para não sugerir divergência quando o usuário de origem estiver ausente.

4. **Validar no preview**
   - Abrir o Razão no período atual e confirmar que as colunas não ficam iguais por preenchimento artificial do frontend.
   - Usar a resposta real do endpoint como referência: hoje ela traz `usuario_origem: null` e `usuario_lancamento` preenchido para vários lançamentos, então a tela deve mostrar Origem vazio/`—` e Lcto. preenchido.