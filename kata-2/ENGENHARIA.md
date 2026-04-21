# Kata 2 - Engenharia

Este arquivo responde a Parte D do enunciado.

## 1. Decisoes de arquitetura no backend

O backend foi organizado em camadas pequenas e explicitas:

- `Controllers/`: traduz HTTP para regras de negocio e codigos de resposta.
- `Services/`: concentra validacao e comportamento da tarefa.
- `Repositories/`: abstrai persistencia; a implementacao atual e em memoria.
- `Dtos/`: separa contrato externo dos modelos internos.
- `Models/`: representa o dominio persistido internamente.
- `Infrastructure/`: concentra configuracao da API, limites e cabecalhos defensivos.

Decisoes principais:

- O controller nao valida regra de negocio diretamente.
- O service nao conhece detalhes de HTTP.
- O repositório nao decide regra funcional; apenas armazena e recupera.
- A configuracao da API foi extraida de `Program.cs` para ficar reaproveitavel, orientada por options e testavel sem precisar subir socket real.
- O repositorio em memoria usa `lock` para evitar corrupcao do dicionario sob concorrencia local.
- A API expõe `ProblemDetails`, `OpenAPI` e `health check` para aproximar o kata de um padrao real de manutencao.

### Fluxo da requisicao

```text
HTTP Request
   |
   v
TasksController
   |
   v
TaskService
   |
   v
ITaskRepository -> InMemoryTaskRepository
   |
   v
BoardTask (modelo interno)
   |
   v
TaskResponse / ProblemDetails
   |
   v
HTTP JSON Response
```

### Organizacao do repositorio da Kata 2

Depois da revisao da entrega, normalizei a estrutura para:

- `src/TaskBoard.Api`
- `src/TaskBoard.Web`
- `tests/TaskBoard.Api.Tests`

O motivo foi manter uma leitura mais coerente para um projeto full-stack com base .NET:

- `src/` concentra tudo que e codigo de producao;
- `tests/` concentra validacao automatizada;
- o backend continua idiomatico para .NET;
- o frontend deixa de parecer um anexo lateral e passa a aparecer como parte da entrega principal.

Considerei um layout `apps/api + apps/web`, que tambem e profissional em monorepos modernos, mas descartei essa opcao porque ela puxa a leitura do repositório mais para o mundo Node/monorepo do que para o cheiro de solucao .NET esperado neste contexto.

### Padroes aplicados explicitamente

- **Controller** para borda HTTP e codigos de resposta.
- **Service** para regra de negocio e validacao.
- **Repository** para esconder detalhes de persistencia.
- **DTO** para contrato externo desacoplado do modelo interno.
- **Result object** (`ServiceResult`) para devolver sucesso/erro sem misturar regra com HTTP.
- **Dependency Injection** nativa do ASP.NET Core para composicao da aplicacao.

### Por que Controllers e nao Minimal APIs

Minimal APIs caberiam no escopo, mas optei por controllers porque:

- deixam a borda HTTP mais explicita para avaliacao;
- escalam melhor visualmente quando ha varios endpoints e `ProblemDetails`;
- combinam bem com testes via `WebApplicationFactory` e `CreatedAtAction`;
- reforcam a separacao entre transporte e service sem concentrar regras em `Program.cs`.

## 2. Como eu garantiria que a API e confiavel em producao

Pelo menos dois aspectos pedidos no enunciado:

### Observabilidade

- logs estruturados com `requestId`, tipo de erro e latencia por endpoint;
- metricas de throughput, taxa de erro e percentis de latencia;
- health checks para dependencia de banco e filas, quando existirem;
- alertas para aumento de 4xx/5xx e degradacao de latencia.

### Qualidade e confiabilidade operacional

- testes automatizados de regra e contrato HTTP com `dotnet test` e `WebApplicationFactory`;
- persistencia duravel com migracoes versionadas;
- estrategia de rollback e deploy controlado;
- documentacao OpenAPI para reduzir ambiguidades de contrato;
- lint e typecheck no frontend para reduzir regressao de interface e contrato consumido.

### Persistencia em memoria vs banco real

O uso de `InMemoryTaskRepository` foi deliberado para o MVP:

- reduz setup e tempo de execucao local;
- mantem a avaliacao focada em contrato HTTP, validacao e integracao full-stack;
- evita inflar a entrega com migracoes, contexto ORM e detalhes operacionais que o enunciado nao exigia.

Eu trocaria essa estrategia quando pelo menos um destes sinais aparecesse:

- necessidade de manter dados apos reinicio;
- usuarios multiplos;
- auditoria/historico;
- consulta mais rica que listar por status.

Nessa evolucao, `schema.sql` ja antecipa a migracao para SQLite/Postgres.

### Consultas esperadas e indices propostos

As consultas mais provaveis para a evolucao relacional desta kata seriam:

- `SELECT * FROM board_task ORDER BY created_at ASC`
- `SELECT * FROM board_task WHERE status = ? ORDER BY created_at ASC`
- `SELECT * FROM board_task ORDER BY updated_at DESC`

Os indices propostos em `schema.sql` foram pensados para isso:

- `ix_board_task_status` acelera o filtro por status;
- `ix_board_task_updated_at` atende a leitura por atividade recente;
- em multiusuario, o proximo indice natural vira `(owner_id, status)` para manter seletividade quando o quadro deixar de ser monousuario.

### Por que nao usei EF Core agora

EF Core seria a opcao natural numa evolucao duravel, mas aqui aumentaria a superficie de codigo sem elevar tanto a nota do escopo principal. Preferi provar primeiro:

- modelagem de contrato;
- isolamento de regra;
- capacidade de trocar o repositório sem mexer em controller ou frontend.

Isso preserva um caminho limpo de migracao futura sem pagar o custo do ORM no MVP.

## 3. Controles tecnicos no escopo atual

Mesmo sendo um kata monousuario, a implementacao atual inclui endurecimento basico:

- limite de corpo de requisicao em `16 KB`;
- profundidade maxima de JSON;
- CORS restrito a `http://localhost:5173`;
- titulo de tarefa com `trim`, obrigatoriedade e limite de `120` caracteres;
- `status` permitido apenas em `pending` ou `completed`;
- `PATCH` exige pelo menos um campo atualizavel;
- respostas de erro com mensagens controladas e `ProblemDetails`;
- cabecalhos defensivos:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Content-Security-Policy` restritiva

### Politica de idioma das mensagens

Mantive uma convencao explicita:

- **codigo, contratos e erros do backend** em ingles;
- **documentacao para o avaliador e texto de interface** em portugues.

O motivo e separar as duas audiencias:

- a API fala a lingua do contrato tecnico (`TaskResponse`, `ProblemDetails`, OpenAPI, testes e nomes de campo);
- a UI fala a lingua do usuario final;
- os documentos falam a lingua da avaliacao.

Preferi documentar a convencao em vez de traduzir parcialmente o backend e criar uma mistura inconsistente.

### `BoardTask` vs `TaskResponse`

Os dois nomes existem de forma intencional:

- `BoardTask` representa o estado interno persistido;
- `TaskResponse` representa o contrato entregue para fora.

Hoje eles sao parecidos, mas a separacao evita acoplar o dominio interno ao payload HTTP e deixa a evolucao futura mais segura.

### `lock` vs `ConcurrentDictionary`

O repositório em memoria usa `lock` em volta de um `Dictionary<Guid, BoardTask>` por simplicidade e previsibilidade:

- a secao critica e pequena;
- ha operacoes compostas (`list`, `get`, `update`, `delete`) que precisam enxergar estado consistente;
- para o volume do kata, clareza pesou mais que micro-otimizacao.

`ConcurrentDictionary` seria valido, mas ainda exigiria cuidado extra para sequencias compostas e ordenacao. Neste contexto, o `lock` ficou mais simples de explicar e testar.

## 3.1 Decisoes adicionais no frontend

O frontend foi mantido com uma unica fonte de estado (`useTaskBoard`) e passou a suportar **quatro visualizacoes do mesmo dataset**:

- `Lista` para leitura linear e operacao direta;
- `Kanban` para perceber distribuicao por status em um board com leitura mais proxima de Trello;
- `Timeline` para ler atividade recente.
- `Em foco` para separar pendencias ativas de fechamentos recentes.

Trade-off assumido:

- ganho: a mesma API passa a ser percebida sob angulos diferentes, agregando demonstracao de raciocinio de produto;
- custo: mais superficie de renderizacao e necessidade de testes adicionais;
- controle: CRUD, filtro e chamadas HTTP continuam centralizados; so muda a camada de apresentacao.

### Por que puxar o visual para um board estilo Trello

O enunciado nao exigia design elaborado, mas a avaliacao considera legibilidade, clareza e qualidade geral da entrega. Por isso, decidi sair do "CRUD com cara de formulário" e aproximar a interface de um board de uso real:

- no `Kanban`, as colunas deixam o fluxo operacional obvio;
- na `Timeline`, a leitura fica mais cronologica e analitica;
- em `Em foco`, a tela fica mais executiva e menos densa;
- a identidade visual foi puxada para a paleta da Unimed para evitar uma UI genérica.

O limite dessa escolha foi manter o contrato e o estado simples: nao houve drag-and-drop, prioridade visual falsa ou ramificacao de regra no frontend. A interface ganhou repertorio sem inventar requisitos novos.

## 4. O que mudaria para suportar multiplos usuarios com autenticacao

Se o sistema precisasse suportar multiplos usuarios autenticados, a arquitetura mudaria assim:

- adicionar autenticacao via provedor confiavel ou camada de identidade;
- incluir `ownerId` ou equivalente no modelo de tarefa;
- escopar `GET`, `POST`, `PATCH` e `DELETE` ao usuario autenticado;
- adicionar autorizacao na camada de service;
- substituir repositório em memoria por banco duravel;
- incluir auditoria de criacao, atualizacao, conclusao e exclusao;
- considerar concorrencia otimista para evitar sobrescrita entre sessoes.

A proposta concreta de schema para SQLite/Postgres esta em `schema.sql`, com o passo de multiusuario documentado como `ALTER TABLE` no final do arquivo.

## 5. Rastreabilidade da Parte D

Pergunta do enunciado -> resposta neste arquivo:

- decisoes de arquitetura do backend -> secoes 1 e 3
- confiabilidade em producao e observabilidade -> secao 2
- multiplos usuarios com autenticacao -> secao 4

## 6. Vitrine Web Geral do Repositorio (extra)

Adicionei uma vitrine web separada em `showcase/` para apresentar o projeto como um todo. Ela existe como camada de apresentacao e **nao substitui**:

- o runner em `bash`;
- os comandos manuais exigidos para cada kata;
- o frontend real da Kata 2.

Ela agora tambem inclui um playground visual da Kata 1 para exploracao de casos e de volume, ainda sem misturar essa experiencia ao produto da Kata 2.

Com a evolução da simulação de volume, o `showcase/` deixou de ser apenas estático e passou a ter uma API local própria de apoio para jobs maiores. Isso continua sendo uma infraestrutura da vitrine, e não do produto da Kata 2.

### Por que ela ficou separada da Kata 2

Misturar essa vitrine ao painel de tarefas da Kata 2 pioraria a leitura do escopo:

- a Kata 2 deixaria de ser apenas o produto pedido;
- a apresentacao do repositorio ficaria acoplada ao frontend do kata;
- qualquer avaliador poderia confundir “produto da kata” com “camada de showcase”.

Ao manter `showcase/` separado:

- o produto da Kata 2 continua limpo;
- o repositório ganha um modo visual de apresentação;
- o caminho manual continua sendo a fonte de verdade da execução.

### Trade-off

A decisão adiciona mais um artefato ao repositório, o que aumenta levemente a superfície de manutenção. Aceitei esse custo porque ele melhora muito a apresentação do conjunto sem contaminar o escopo técnico da Kata 2.

O mesmo raciocínio vale para o playground visual: ele agrega percepção de execução real para quem prefere interface gráfica, mas continua explicitamente separado do produto full-stack pedido no enunciado.

No momento em que a vitrine ganhou API local própria, o trade-off ficou mais claro:

- ganho: o showcase suporta exploração mais rica e responsiva;
- ganho: a UI deixa de travar em cenários mais pesados;
- custo: o modo de execução deixa de ser “só arquivos estáticos”;
- custo: passa a existir uma pequena superfície de backend local para manter.

Para reduzir esse custo de manutenção, a API local do showcase não ficou sem proteção: ela recebeu testes automatizados próprios em `showcase/test_server.py`, cobrindo o fluxo de jobs e os endpoints expostos.
