# Kata 2 — Análise de Requisitos

## 1. Ambiguidades Identificadas

Os requisitos foram passados de forma informal. Para cada ambiguidade abaixo registro a pergunta que eu faria ao cliente e a decisão tomada na ausência da resposta, para desbloquear a implementação do MVP.

### 1.1 Escopo de usuário (mono ou multiusuário)

- **Ambiguidade**: o cliente diz "minhas tarefas", sem definir se cada usuário tem sua própria lista ou se o painel é único para a equipe.
- **Pergunta ao cliente**: "O painel é individual por usuário ou compartilhado entre o time?"
- **Decisão tomada**: MVP monousuário, sem autenticação, com escopo único. Migração para multiusuário documentada como evolução.

### 1.2 Valores de status permitidos

- **Ambiguidade**: "situação" e "concluídas" sugerem `pending`/`completed`, mas não se descarta `in_progress`, `canceled` ou outros.
- **Pergunta ao cliente**: "Quais situações uma tarefa pode assumir? Precisamos representar tarefas em andamento ou canceladas?"
- **Decisão tomada**: apenas `pending` e `completed`. Demais estados são tratados como backlog.

### 1.3 Validação de título

- **Ambiguidade**: o título é obrigatório? Existe tamanho máximo? Pode ser duplicado?
- **Pergunta ao cliente**: "Qual o comportamento esperado quando o usuário tenta criar uma tarefa sem título ou com um título muito longo?"
- **Decisão tomada**: título obrigatório, não vazio após `trim`, limitado a 120 caracteres, sem exigência de unicidade.

### 1.4 Significado de "deletar"

- **Ambiguidade**: "deletar" pode ser exclusão definitiva ou arquivamento (soft delete).
- **Pergunta ao cliente**: "Quando o usuário deleta uma tarefa, ela precisa ser recuperável depois?"
- **Decisão tomada**: hard delete. Se o cliente pedir auditoria, migramos para soft delete no futuro.

### 1.5 Campo de prioridade

- **Ambiguidade**: o cliente sugeriu prioridade, mas também disse "pode ficar pra depois".
- **Pergunta ao cliente**: "Podemos tratar prioridade como feature de uma próxima entrega, confirmando que o MVP entrega apenas listar/criar/concluir/deletar/filtrar?"
- **Decisão tomada**: prioridade fica fora do MVP. Registrada no backlog (ver seção 4).

### 1.6 Timestamp de conclusão

- **Ambiguidade**: precisa registrar quando a tarefa foi concluída (para relatórios ou histórico)?
- **Pergunta ao cliente**: "Precisamos guardar a data de conclusão para relatórios futuros?"
- **Decisão tomada**: manter `createdAt` e `updatedAt`. `updatedAt` cobre a transição para `completed`.

## 2. Requisitos Funcionais (RF)

| ID | Requisito | Critério de aceitação |
| --- | --- | --- |
| RF-01 | O sistema deve listar todas as tarefas. | `GET /tasks` retorna 200 com a lista ordenada por data de criação. |
| RF-02 | O sistema deve filtrar tarefas por status. | `GET /tasks?status=pending` e `GET /tasks?status=completed` retornam apenas as tarefas daquele status. |
| RF-03 | O sistema deve criar uma nova tarefa. | `POST /tasks` com título válido retorna 201 com a tarefa criada em status `pending`. |
| RF-04 | O sistema deve recusar criação de tarefa inválida. | Título vazio, só espaços ou acima de 120 caracteres retorna 400. |
| RF-05 | O sistema deve atualizar título e/ou status de uma tarefa. | `PATCH /tasks/{id}` retorna 200 com a tarefa atualizada. |
| RF-06 | O sistema deve recusar status inválido. | Status fora de `pending`/`completed` retorna 400. |
| RF-07 | O sistema deve marcar uma tarefa como concluída. | `PATCH /tasks/{id}` com `status=completed` atualiza o registro. |
| RF-08 | O sistema deve excluir uma tarefa existente. | `DELETE /tasks/{id}` retorna 204. |
| RF-09 | O sistema deve responder 404 para IDs inexistentes. | Operações sobre ID inexistente retornam 404. |
| RF-10 | O frontend deve permitir criar, concluir, excluir e filtrar tarefas. | A UI consome os endpoints e reflete o estado atual do backend. |

## 3. Requisitos Não Funcionais (RNF)

| ID | Requisito | Observação |
| --- | --- | --- |
| RNF-01 | Usabilidade | A UI deve manter feedback visual claro de status e erros. |
| RNF-02 | Confiabilidade | Requisições concorrentes não devem corromper o repositório interno. |
| RNF-03 | Segurança | Validar todas as entradas, restringir CORS, limitar tamanho de payload e esconder detalhes internos em erros. |
| RNF-04 | Manutenibilidade | Separar controller, service, repositório e DTOs para facilitar evolução. |
| RNF-05 | Testabilidade | Regras isoladas em service para permitir testes unitários; fluxos HTTP cobertos por testes de integração. |
| RNF-06 | Observabilidade (produção) | Logs estruturados, métricas e health checks são recomendados na evolução para produção. |
| RNF-07 | Desempenho | Operações devem responder em menos de 200 ms no ambiente local com dataset do MVP. |
| RNF-08 | Portabilidade | O backend deve rodar com `dotnet run` e o frontend com `npm run dev`, sem dependências externas de infraestrutura. |

## 4. Tratamento do Backlog — Campo de Prioridade

O campo de prioridade foi marcado explicitamente como "pode ficar pra depois". O tratamento adotado é:

1. Registrar prioridade como **história de backlog** separada, com critérios de aceitação próprios (níveis permitidos, ordenação, filtro combinado, migração de dados existentes).
2. Deixar o modelo da tarefa aberto para extensão futura: adicionar o campo `priority` como opcional e `null` por padrão não quebra contratos existentes.
3. Documentar a decisão no MVP para que a revisão com o cliente aconteça antes de qualquer implementação — evitando retrabalho se ele mudar o formato da prioridade.
4. Sugerir que a prioridade entre na próxima sprint apenas depois de validar com o cliente: quantos níveis, se existe SLA por nível e se o filtro/ordenação por prioridade é obrigatório.

Essa abordagem preserva o princípio de entregar o menor incremento útil e evita carregar o MVP com decisões que ainda dependem de alinhamento com o cliente.
