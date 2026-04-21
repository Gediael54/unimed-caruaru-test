# Kata 2 - Mapa de Testes

Resumo do que cada escopo de teste cobre. A Kata 2 separa **regra de dominio**,
**contrato HTTP** e **UI** em suites independentes, todas rodaveis a partir da
raiz do repositorio.

## Como rodar

```bash
bash scripts/kata.sh kata2 all
```

Equivalente manual:

```bash
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Api
npm --prefix kata-2/src/TaskBoard.Web run lint
npm --prefix kata-2/src/TaskBoard.Web run test
npm --prefix kata-2/src/TaskBoard.Web run build
```

## Backend - `Scope=Backend` (TaskServiceTests)

Foco em regras puras, sem subir servidor. Usa `InMemoryTaskRepository` direto.

- criacao aplica `trim` no titulo e status inicial `pending`;
- criacao rejeita titulo em branco;
- criacao rejeita titulo acima de 120 caracteres;
- listagem com `status` invalido retorna erro de validacao;
- `PATCH` sem nenhum campo atualizavel e rejeitado;
- `PATCH` que nao altera o payload nao atualiza `UpdatedAt`;
- `PATCH` valida titulo e status;
- `DELETE` remove tarefa existente;
- repositorio preserva escritas concorrentes.

## Contrato HTTP - `Scope=Api` (TasksApiTests)

Sobe `WebApplicationFactory` e valida o contrato exposto.

- `POST /tasks` retorna `201 Created` com corpo e `Location` corretos;
- `GET /tasks` retorna `200 OK` com itens criados;
- `GET /tasks?status=invalid` responde `ProblemDetails`;
- `POST /tasks` com titulo acima do limite retorna `400`;
- `PATCH /tasks/{id}` inexistente retorna `404`;
- `PATCH /tasks/{id}` com payload vazio e recusado;
- `PATCH /tasks/{id}` com status invalido retorna `400`;
- `DELETE /tasks/{id}` existente retorna `204`;
- `DELETE /tasks/{id}` inexistente retorna `404`;
- `GET /health` retorna status saudavel;
- documento OpenAPI e exposto;
- cabecalhos de seguranca aplicados em respostas de API;
- configuracao da API respeita defaults esperados (tamanho de corpo, CORS, etc.).

### Matriz rapida de status code

| Status code | Evidencia |
| --- | --- |
| `200 OK` | `GET /tasks`, `GET /health`, `PATCH /tasks/{id}` com payload valido |
| `201 Created` | `POST /tasks` com titulo valido |
| `204 No Content` | `DELETE /tasks/{id}` em tarefa existente |
| `400 Bad Request` | filtro invalido, titulo invalido, `PATCH` vazio, status invalido |
| `404 Not Found` | `PATCH` e `DELETE` para ID inexistente |

## Frontend - Vitest (`src/TaskBoard.Web/src/*.test.*`)

Testes rodam em JSDOM com setup em `src/test/setup.ts`.

- `App.test.tsx`: carga inicial, filtro por status, troca de visualizacao
  (lista/kanban/timeline/em foco) e acoes principais (criar, concluir, excluir);
- `task-board.test.ts`: regra do hook/store de tarefas isolada da UI.

Alem dos testes: `npm run lint` (ESLint) e `npm run build` (tsc + vite).

## Piramide de testes adotada

- **base**: regras puras do `TaskService` e comportamento do repositório em memoria;
- **meio**: contrato HTTP com `WebApplicationFactory`;
- **topo leve**: UI em Vitest/JSDOM para garantir que o usuario consegue operar a tela.

Nao houve browser E2E real no escopo do MVP, mas a combinacao atual cobre:

- regra;
- contrato;
- interacao principal da interface.

## Cobertura

Medi a cobertura do backend com o collector do `coverlet`:

```bash
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --collect:"XPlat Code Coverage" --results-directory /tmp/kata2-coverage
```

Leitura usada para avaliacao:

- **backend**: `100%` de cobertura de linha no codigo autoral em `src/TaskBoard.Api`;
- **frontend**: `100%` de statements, branches, functions e lines em `src/TaskBoard.Web/src`.

Observacao importante:

- o XML bruto do collector do backend fica artificialmente menor porque mistura harness de teste e arquivos gerados em `obj/`;
- por isso registrei o recorte util: apenas o codigo escrito para a kata;
- no frontend, a medicao foi feita com Vitest + provider `v8`.

## Fora do escopo

- nao ha teste end-to-end com navegador real;
- nao ha teste de carga ou concorrencia contra servidor real;
- nao ha teste de persistencia duravel (a Kata 2 usa repositorio em memoria).
