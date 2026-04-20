# Notas de Segurança

## Escopo

Este kata é um quadro de tarefas monousuário sem autenticação. O objetivo de segurança é manter a implementação pequena, explícita e resistente a erros comuns dentro desse escopo.

## Controles Implementados

- Validação de entrada para título e status de tarefa.
- Título limitado a 120 caracteres.
- Corpo da requisição limitado a 16 KB.
- Profundidade máxima para payload JSON.
- CORS restrito à origem local do frontend.
- Mensagens de erro controladas, sem exposição de detalhes internos.
- Sem credenciais de banco, segredos ou tokens específicos de ambiente no código.
- Sem geração dinâmica de SQL ou execução de shell.
- Cabeçalhos defensivos nas respostas da API.

## Riscos Residuais

- O armazenamento em memória não é durável e não é adequado para produção.
- Não há autenticação nem autorização, porque o escopo foi definido como monousuário.
- A segurança de transporte depende do ambiente de deploy. O desenvolvimento local roda em HTTP.
- A varredura de dependências deve rodar em CI depois que as dependências de frontend forem instaladas.

## Adições Recomendadas Para Produção

- Deploy exclusivamente em HTTPS com HSTS.
- Autenticação via provedor de identidade confiável.
- Verificações de autorização por usuário.
- Persistência durável com migrações.
- Rate limiting.
- Logs, métricas e alertas centralizados.
- Varredura automatizada de dependências e contêineres.
