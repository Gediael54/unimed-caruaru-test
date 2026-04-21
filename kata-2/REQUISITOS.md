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

| ID | Prioridade | Requisito | Critério de aceitação curto |
| --- | --- | --- | --- |
| RF-01 | Must-have | O sistema deve listar todas as tarefas. | **Given** tarefas cadastradas, **when** o cliente chama `GET /tasks`, **then** recebe `200 OK` com a lista ordenada por criação. |
| RF-02 | Must-have | O sistema deve filtrar tarefas por status. | **Given** tarefas pendentes e concluídas, **when** o cliente chama `GET /tasks?status=pending|completed`, **then** recebe apenas o subconjunto correspondente. |
| RF-03 | Must-have | O sistema deve criar uma nova tarefa. | **Given** um título válido, **when** o cliente envia `POST /tasks`, **then** recebe `201 Created` com a tarefa criada em `pending`. |
| RF-04 | Must-have | O sistema deve recusar criação de tarefa inválida. | **Given** título vazio, em branco ou acima de 120 caracteres, **when** o cliente envia `POST /tasks`, **then** recebe `400 Bad Request`. |
| RF-05 | Must-have | O sistema deve atualizar título e/ou status de uma tarefa. | **Given** uma tarefa existente, **when** o cliente envia `PATCH /tasks/{id}` com dados válidos, **then** recebe `200 OK` com a tarefa atualizada. |
| RF-06 | Must-have | O sistema deve recusar status inválido. | **Given** um valor fora de `pending`/`completed`, **when** o cliente tenta atualizar ou filtrar por esse status, **then** recebe `400 Bad Request`. |
| RF-07 | Must-have | O sistema deve marcar uma tarefa como concluída. | **Given** uma tarefa pendente, **when** o cliente envia `PATCH /tasks/{id}` com `status=completed`, **then** o status é atualizado. |
| RF-08 | Must-have | O sistema deve excluir uma tarefa existente. | **Given** uma tarefa existente, **when** o cliente envia `DELETE /tasks/{id}`, **then** recebe `204 No Content`. |
| RF-09 | Must-have | O sistema deve responder 404 para IDs inexistentes. | **Given** um ID desconhecido, **when** o cliente tenta consultar, atualizar ou excluir, **then** recebe `404 Not Found`. |
| RF-10 | Must-have | O frontend deve permitir criar, concluir, excluir e filtrar tarefas. | **Given** a API disponível, **when** o usuário opera a UI, **then** a tela reflete criação, conclusão, exclusão e filtro por status. |

### Extras implementados fora do MVP estrito

Os itens abaixo não entram como requisito funcional obrigatório do enunciado, mas foram adicionados sem mudar o contrato principal:

| ID | Tipo | Entrega |
| --- | --- | --- |
| EX-01 | Nice-to-have | Alternância de visualização em `lista`, `kanban` e `timeline` sobre o mesmo estado. |
| EX-02 | Nice-to-have | Resumo global de tarefas preservado mesmo quando a lista está filtrada. |

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

## 3.1 Matriz de rastreabilidade

| Requisito | Endpoint / superfície | Evidência principal |
| --- | --- | --- |
| RF-01 | `GET /tasks` | `TasksApiTests.List_ReturnsOk_WithCreatedTasks` + UI em `App.test.tsx` |
| RF-02 | `GET /tasks?status=pending|completed` | `TasksApiTests.List_RejectsInvalidStatus_WithProblemDetails` e cenário de filtro em `App.test.tsx` |
| RF-03 | `POST /tasks` | `TaskServiceTests.Create_TrimsTitle_AndDefaultsStatusToPending` + `TasksApiTests.Create_ReturnsCreatedPayload_AndLocationHeader` |
| RF-04 | `POST /tasks` | `TaskServiceTests.Create_RejectsBlankTitle`, `TaskServiceTests.Create_RejectsTitleLongerThan120Characters` e `TasksApiTests.Create_RejectsTitleAboveMaxLength` |
| RF-05 | `PATCH /tasks/{id}` | `TaskServiceTests.Update_ValidatesStatusAndTitle` |
| RF-06 | `GET /tasks?status=...` e `PATCH /tasks/{id}` | `TaskServiceTests.List_RejectsInvalidStatus`, `TasksApiTests.List_RejectsInvalidStatus_WithProblemDetails` e `TasksApiTests.Update_RejectsInvalidStatus` |
| RF-07 | `PATCH /tasks/{id}` | fluxo de conclusão em `App.test.tsx` |
| RF-08 | `DELETE /tasks/{id}` | `TasksApiTests.Delete_ReturnsNoContent_WhenTaskExists` e fluxo de exclusão em `App.test.tsx` |
| RF-09 | `GET /tasks/{id}`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}` | `TasksApiTests.Update_ReturnsNotFound_WhenTaskDoesNotExist` e `TasksApiTests.Delete_ReturnsNotFound_WhenTaskDoesNotExist` |
| RF-10 | `TaskBoard.Web` | `App.test.tsx` e `task-board.test.ts` |

## 4. Tratamento do Backlog — Campo de Prioridade

O campo de prioridade foi marcado explicitamente como "pode ficar pra depois". Em vez de deixar isso como um `TODO` genérico, tratei como backlog real de produto:

| Item | Tipo | Valor esperado | Dependencias de descoberta | Status |
| --- | --- | --- | --- | --- |
| BL-01 | Prioridade por tarefa | Melhorar triagem visual e ordenacao de trabalho | confirmar níveis, regra de ordenação, impacto no filtro e se existe SLA por nível | backlog pronto para refinamento |

### BL-01 — História candidata

- **Perguntas pendentes ao cliente**:
  - Quais níveis de prioridade existem?
  - Prioridade muda apenas visualmente ou também altera ordenação padrão?
  - O filtro deve combinar `status + priority`?
  - Prioridade precisa aparecer já na criação ou pode ser editada depois?
- **Critérios de aceitação propostos**:
  - permitir `low`, `medium` e `high` ou equivalente acordado;
  - exibir prioridade na UI sem comprometer leitura do status;
  - permitir atualização por `PATCH /tasks/{id}`;
  - manter compatibilidade com tarefas antigas sem prioridade definida;
  - cobrir ordenação/filtro adicional com testes de backend e frontend.
- **Impacto arquitetural esperado**:
  - contrato HTTP ganha campo opcional;
  - service passa a validar conjunto permitido;
  - UI precisa suportar badge, formulário e possível ordenação;
  - repositório em memória continua viável no MVP, mas a migração para persistência durável exige versionamento do schema/contrato.

### Decisão de priorização

Escolhi **não implementar prioridade no MVP** por três razões:

1. o enunciado trata o item explicitamente como opcional;
2. faltavam definições importantes de produto, então implementar agora aumentaria o risco de retrabalho;
3. a entrega principal ganha mais valor com fluxo CRUD claro, contrato HTTP consistente, testes e integração backend/frontend funcionando.

Essa abordagem preserva o princípio de entregar o menor incremento útil e evita carregar o MVP com decisões que ainda dependem de alinhamento com o cliente.
