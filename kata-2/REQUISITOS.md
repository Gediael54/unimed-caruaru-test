# Kata 2 - Analise de Requisitos

## 1. Decisao de escopo

Esta kata deixa de ser uma todo-list minima e passa a ser um board profissional
de escopo controlado:

- **single-workspace**: existe um unico quadro;
- **sem autenticacao real**: nao existe login, sessao, tenant ou ownership por usuario;
- **sem multiusuario**: o sistema representa o quadro do produto, nao colaboracao em tempo real;
- **CRUD serio de board**: tarefas com `title`, `description`, `priority`,
  ciclo de status e arquivamento por `DELETE`.

O objetivo e elevar o produto sem incluir uma camada de identidade que o sistema
ainda nao sustenta de verdade.

## 2. Ambiguidades resolvidas

### 2.1 Workspace unico vs usuarios

- **Pergunta ao cliente**: "O board e pessoal, por equipe ou por organizacao?"
- **Decisao**: existe um unico workspace. Todas as tarefas pertencem ao mesmo
  quadro logico.
- **Justificativa**: autenticacao, ownership, permissao e multiusuario alteram
  contrato, modelo de dados, seguranca, observabilidade e estrategia de
  concorrencia. Isso e fase arquitetural seguinte, nao detalhe cosmetico.

### 2.2 `description`

- **Pergunta ao cliente**: "A descricao e obrigatoria ou apenas recomendada?"
- **Decisao**: `description` e opcional, com `trim`, aceita vazio e deve ter
  limite de tamanho definido pela implementacao.
- **Justificativa**: board profissional precisa contexto adicional, mas obrigar
  descricao em todo card piora captura rapida.
  No frontend, a descricao tambem suporta marcadores estruturados como
  `Responsável`, `Prazo`, `Labels` e `Checklist` para enriquecer a leitura do
  board sem expandir o contrato HTTP neste MVP.

### 2.3 `priority`

- **Pergunta ao cliente**: "Quais niveis de prioridade o produto precisa?"
- **Decisao**: `priority` faz parte do MVP e aceita `low`, `medium`, `high`.
- **Justificativa**: sem prioridade, o board continua funcional, mas ainda
  parece lista simples. O trio cobre o essencial sem virar engine de SLA.

### 2.4 Ciclo de status

- **Pergunta ao cliente**: "Precisamos representar andamento e cancelamento?"
- **Decisao**: `status` aceita `pending`, `in_progress`, `completed`,
  `cancelled`.
- **Justificativa**: um board profissional precisa distinguir backlog,
  execucao, entrega e descarte.

### 2.5 Significado de `DELETE`

- **Pergunta ao cliente**: "Excluir significa apagar definitivamente?"
- **Decisao**: `DELETE /tasks/{id}` faz **soft delete**, isto e, arquiva o card.
  O card arquivado pode voltar ao board por `PATCH` para `pending`, mas isso e
  tratado como desfazer operacional simples, nao como um fluxo completo de
  lixeira.
- **Justificativa**: arquivamento preserva historico e reduz risco operacional
  sem introduzir a complexidade de um fluxo completo de lixeira.

## 3. Requisitos funcionais

| ID | Prioridade | Requisito | Criterio de aceitacao curto |
| --- | --- | --- | --- |
| RF-01 | Must-have | O sistema deve listar tarefas ativas do workspace. | **Given** tarefas ativas cadastradas, **when** o cliente chama `GET /tasks`, **then** recebe `200 OK` com cards nao arquivados. |
| RF-02 | Must-have | O sistema deve filtrar tarefas ativas por status. | **Given** tarefas em estados diferentes, **when** o cliente chama `GET /tasks?status=pending|in_progress|completed|cancelled`, **then** recebe apenas o subconjunto correspondente. |
| RF-03 | Must-have | O sistema deve criar tarefa com `title`, `description` e `priority`. | **Given** payload valido, **when** o cliente envia `POST /tasks`, **then** recebe `201 Created` com a tarefa criada em `pending`. |
| RF-04 | Must-have | O sistema deve validar payload de criacao. | **Given** `title` vazio, `priority` invalida ou `status` fora do conjunto permitido, **when** o cliente envia payload invalido, **then** recebe `400 Bad Request`. |
| RF-05 | Must-have | O sistema deve atualizar `title`, `description`, `priority` e `status`. | **Given** uma tarefa existente, **when** o cliente envia `PATCH /tasks/{id}` com dados validos, **then** recebe `200 OK` com o card atualizado. |
| RF-06 | Must-have | O sistema deve permitir o ciclo completo de status. | **Given** uma tarefa existente, **when** o cliente muda o `status`, **then** o board reflete `pending`, `in_progress`, `completed` e `cancelled` sem valores fora desse conjunto. |
| RF-07 | Must-have | O sistema deve arquivar tarefa por `DELETE`. | **Given** uma tarefa existente, **when** o cliente envia `DELETE /tasks/{id}`, **then** recebe `204 No Content` e a tarefa deixa de aparecer no board ativo. |
| RF-08 | Must-have | O sistema deve responder `404 Not Found` para IDs inexistentes. | **Given** um ID desconhecido, **when** o cliente tenta consultar, atualizar ou arquivar, **then** recebe `404 Not Found`. |
| RF-09 | Must-have | O frontend deve operar o board como quadro profissional. | **Given** a API disponivel, **when** o usuario cria cards com contexto, move status, filtra por etapa e arquiva itens do board, **then** a UI reflete o estado atualizado do workspace. |
| RF-10 | Should-have | O sistema deve permitir restaurar card arquivado para o board ativo. | **Given** uma tarefa arquivada, **when** o cliente atualiza o `status` para `pending`, **then** ela volta a aparecer na listagem ativa. |

## 4. Requisitos nao funcionais

| ID | Requisito | Observacao |
| --- | --- | --- |
| RNF-01 | Clareza de produto | A interface deve comunicar prioridade, status e arquivamento sem depender de treinamento. |
| RNF-02 | Confiabilidade | Operacoes concorrentes nao devem corromper o repositório interno. |
| RNF-03 | Validacao | Toda entrada deve ser validada antes de alterar estado. |
| RNF-04 | Manutenibilidade | Contrato, regra e persistencia devem permanecer desacoplados para futura evolucao para auth e multiworkspace. |
| RNF-05 | Auditabilidade minima | O soft delete deve preservar rastros suficientes para historico interno do board. |
| RNF-06 | Testabilidade | Regras de board devem ser cobertas por testes unitarios, de contrato HTTP e de UI. |
| RNF-07 | Portabilidade | O MVP deve seguir executavel localmente sem infraestrutura externa obrigatoria. |

## 5. Fora do escopo atual

Os itens abaixo **nao** entram neste escopo e ficam documentados como proxima
fase arquitetural:

- autenticacao real;
- times, papeis e permissao;
- multiusuario e ownership por card;
- colaboracao em tempo real;
- lixeira completa com listagem dedicada, auditoria e fluxo proprio;
- historico completo de transicoes e auditoria regulatoria.

## 6. Por que auth, times e permissoes ficam para a proxima fase

Esses temas nao foram adiados por simplificacao superficial. Eles mudam a
arquitetura de verdade:

1. **Modelo de dados**: tarefas deixam de pertencer apenas ao workspace e
   passam a depender de `workspaceId`, `ownerId`, membership e regras de acesso.
2. **Contrato HTTP**: filtros, respostas e erros passam a precisar distinguir
   autenticacao, autorizacao e isolamento entre usuarios.
3. **Seguranca**: entram sessao/token, expiracao, rotacao, hashing, rate limit,
   trilha de auditoria e observabilidade orientada a incidente.
4. **Concorrencia**: com mais de um usuario, edicao simultanea e conflito deixam
   de ser caso raro.

## 7. Por que login fake seria pior aqui

Adicionar login fake neste momento pioraria a entrega por quatro motivos:

1. **Cria falsa sensacao de seguranca**: pareceria haver identidade, mas sem
   isolamento real de dados, autorizacao ou sessao confiavel.
2. **Polui o produto**: o avaliador gastaria tempo com uma etapa cenografica em
   vez de enxergar a evolucao substantiva do board.
3. **Aumenta custo sem ganho estrutural**: telas, estado de sessao e mocks de
   usuario adicionam manutencao, mas nao resolvem ownership nem permissao.
4. **Confunde a proxima fase**: documentar claramente a evolucao arquitetural e
   mais correto do que implementar um requisito ainda nao sustentado pelo sistema.

## 8. Sintese do MVP

O recorte final da Kata 2 e:

- um board unico, profissional e local;
- cards com `title`, `description`, `priority` e `status`;
- transicoes entre `pending`, `in_progress`, `completed` e `cancelled`;
- `DELETE` significando arquivamento, nao apagamento definitivo;
- documentacao explicita de que identidade, colaboracao e permissao ficam para
  a fase seguinte.
