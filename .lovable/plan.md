

# Adicionar Explicação e Sugestão de Resolução nos Logs de Erros

## Problema
A tabela de logs exibe apenas os dados brutos (módulo, status, mensagem), sem contexto para o usuário entender o que causou o erro ou como resolver.

## Solução
Criar uma função helper `getErrorExplanation(log)` que, com base no `module`, `status_code` e padrões na `message`, retorna um objeto `{ explicacao, resolucao }`. Exibir esses textos em uma nova coluna ou como linha expansível abaixo de cada log.

### Mapeamentos de erro a implementar

| Padrão | Explicação | Resolução |
|--------|-----------|-----------|
| `status_code = 401` | Sessão da API ERP expirou ou credenciais inválidas | Verifique as credenciais da API em Configurações > API e reconecte |
| `status_code = 403` | Acesso negado ao recurso solicitado | Verifique as permissões do usuário no ERP |
| `status_code = 404` | Endpoint ou recurso não encontrado na API | Verifique se a URL da API está correta em Configurações |
| `status_code >= 500` | Erro interno no servidor da API ERP | O servidor ERP está com problemas. Tente novamente mais tarde |
| `module = 'global/js-error'` | Erro inesperado no navegador (JavaScript) | Tente recarregar a página (Ctrl+Shift+R). Se persistir, reporte ao suporte |
| `module = 'global/unhandled-rejection'` | Uma operação assíncrona falhou inesperadamente | Recarregue a página. Verifique sua conexão de internet |
| `message` contém "fetch" ou "network" | Falha de comunicação de rede | Verifique sua conexão com a internet e se o servidor ERP está acessível |
| `message` contém "timeout" | A requisição demorou demais para responder | O servidor pode estar sobrecarregado. Tente novamente em alguns minutos |
| Fallback genérico | Erro não categorizado | Verifique os detalhes e, se necessário, contate o suporte técnico |

### Alterações

**Arquivo: `src/pages/ConfiguracoesPage.tsx`**

1. Adicionar função `getErrorExplanation(log)` que recebe o objeto de log e retorna `{ explicacao: string, resolucao: string }` usando os mapeamentos acima
2. Adicionar duas novas colunas à tabela de logs: **"Explicação"** e **"Como Resolver"**
3. Estilizar com cores suaves — explicação em texto normal, resolução em texto azul/link para destacar a ação

### Detalhes técnicos

- A função usa `if/else` em cascata: primeiro checa `module`, depois `status_code`, depois padrões na `message` via `.includes()`
- Colunas terão `max-w-[250px] truncate` com `title` para ver o texto completo no hover
- Sem alterações no banco de dados — tudo calculado no frontend

