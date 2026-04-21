# Kata 2 - Painel de Tarefas

## Organizacao da Entrega

Os arquivos da Kata 2 foram organizados para seguir o enunciado:

- `REQUISITOS.md` - Parte A (analise de requisitos)
- `README.md` (este arquivo) - Partes B e C (backend, frontend e persistencia)
- `ENGENHARIA.md` - Parte D (decisoes de arquitetura e evolucao)
- `schema.sql` - proposta de schema para evolucao para SQLite/Postgres
- `TESTES.md` - mapa das suites de teste (Backend, Api, Web)

Estrutura de codigo:

- `TaskBoard.sln` - solution .NET da kata, usada para IDE e navegacao
- `Directory.Build.props` - configuracao centralizada dos projetos .NET
- `src/TaskBoard.Api` - codigo de producao do backend
- `src/TaskBoard.Web` - frontend React + TypeScript da kata
- `tests/TaskBoard.Api.Tests` - testes xUnit do backend e do contrato HTTP + harness leve

### Por que essa estrutura

Escolhi manter a Kata 2 com cara de **solucao .NET profissional**, sem deixar o frontend "solto" na raiz:

- `src/` concentra tudo que e codigo de producao da feature full-stack;
- `tests/` concentra a validacao automatizada;
- `TaskBoard.Api` segue a convencao esperada para projeto .NET;
- `TaskBoard.Web` deixa claro que o frontend tambem e parte do produto, mas sem fingir que ele pertence a solution C#.

O objetivo foi ficar mais coerente para um repositório misto (.NET + React) sem cair em um layout excessivamente "Node-first" nem em um layout que esconda o frontend fora da estrutura principal da kata.

## Como Executar

A Kata 2 precisa do backend e do frontend rodando ao mesmo tempo. A entrega oferece **tres formas** para isso, todas atendem o enunciado. Escolha a que preferir.

### Forma 1 - um unico comando (recomendado)

Na raiz do repositorio:

```bash
bash scripts/kata.sh kata2 dev
```

O que acontece:

1. Sobe o backend (`dotnet run` em `http://localhost:5000`) em segundo plano, com logs em `kata-2/.logs/backend.log`.
2. Aguarda `GET /health` responder (timeout de 60s).
3. Sobe o frontend (`npm run dev` em `http://localhost:5173`) em primeiro plano.
4. Ao receber `Ctrl+C`, encerra automaticamente o backend via `trap`.

**Trade-offs:**

- Precisa de `curl` no ambiente para a checagem de `/health`.
- Logs do backend ficam no arquivo, nao no terminal. Use `tail -f kata-2/.logs/backend.log` se quiser acompanhar em tempo real.
- Se `localhost:5000` ou `localhost:5173` ja estiverem ocupados, a forma 2 facilita o diagnostico porque cada servico usa seu proprio terminal.
- O `trap` encerra o backend quando o comando termina; se o processo bash pai for morto abruptamente (`kill -9`), pode sobrar processo `dotnet` orfao. Nesse caso, `pkill -f TaskBoard.Api` resolve.

### Forma 2 - dois terminais (o enunciado pressupoe este fluxo)

Terminal 1 (backend):

```bash
dotnet run --project kata-2/src/TaskBoard.Api/TaskBoard.Api.csproj --urls http://localhost:5000
```

Terminal 2 (frontend):

```bash
cd kata-2/src/TaskBoard.Web
npm install   # apenas na primeira execucao
npm run dev
```

Equivalentes via runner:

```bash
bash scripts/kata.sh kata2 backend-dev    # Terminal 1
bash scripts/kata.sh kata2 frontend-dev   # Terminal 2
```

### Forma 3 - menu interativo

```bash
bash scripts/kata.sh
```

No menu principal, escolha `[1] Kata 2 · backend + frontend em um comando`, ou abra o submenu com `[b]` para ver todas as opcoes.

### Configuracao opcional do frontend

Copie `src/TaskBoard.Web/.env.example` para `src/TaskBoard.Web/.env` caso queira trocar `VITE_API_BASE_URL`.

## Parte B - Backend

### Endpoints implementados

- `GET /tasks`
- `GET /tasks?status=pending`
- `GET /tasks?status=completed`
- `GET /tasks/{id}`
- `GET /health`
- `GET /openapi/v1.json`
- `POST /tasks`
- `PATCH /tasks/{id}`
- `DELETE /tasks/{id}`

### Escolha de persistencia

A persistencia escolhida foi **em memoria**, usando `InMemoryTaskRepository`.

Essa escolha foi feita para manter o MVP pequeno, auditavel e rapido de executar localmente, priorizando:

- contratos HTTP claros;
- documentacao OpenAPI do contrato;
- separacao entre controller, service, repository e DTOs;
- tratamento de erro e validacao de entrada;
- integracao funcional entre backend e frontend sem depender de banco externo.

### Trade-offs da persistencia em memoria

Vantagens:

- setup minimo;
- menor overhead de infraestrutura;
- foco maior nas regras da kata.

Limitacoes:

- dados sao perdidos ao reiniciar a aplicacao;
- nao ha persistencia duravel;
- nao e a escolha correta para producao ou multiusuario.

### Alternativas consideradas

- `SQLite` - evolucao natural para manter simplicidade com persistencia duravel local.
- `Arquivo JSON` - atenderia ao requisito minimo, mas com pior controle de concorrencia e integridade.
- `Banco relacional` - escolha correta para producao, mas adicionaria infraestrutura e migracoes fora do foco do MVP.

Como a Parte B permite escolher a estrategia de persistencia desde que seja justificada, a entrega segue com persistencia em memoria por ser a opcao mais direta para o escopo e tempo do teste.

### Convencao de idioma

- backend, contratos e mensagens tecnicas da API em ingles;
- interface e documentacao voltadas ao avaliador em portugues.

Essa divisao foi intencional: a API fala a lingua do contrato tecnico; a interface fala a lingua do usuario final e da avaliacao.

## Parte C - Frontend

### Funcionalidades implementadas

- listagem de tarefas com indicacao visual de status;
- formulario para criacao de nova tarefa;
- acao para concluir tarefa;
- acao para excluir tarefa;
- filtro por status (`all`, `pending`, `completed`);
- quatro modos de visualizacao sobre o mesmo conjunto de dados:
  - lista;
  - kanban com leitura de board operacional estilo Trello;
  - timeline por atividade recente;
  - em foco, separando pendencias ativas e fechamentos recentes;
- exibicao de erros de API e estados de carregamento;
- resumo global das tarefas, preservado mesmo quando a lista esta filtrada;
- organizacao em componentes, hook de estado e cliente HTTP separado.

### Sobre os quatro modos de visualizacao

Os modos extras nao substituem o fluxo principal da tela. A intencao foi agregar leitura e demonstrar raciocinio de produto sem complicar o MVP:

- `Lista` continua sendo a leitura mais direta e previsivel;
- `Kanban` facilita perceber distribuicao por status e reforca a sensacao de board real;
- `Timeline` ajuda a enxergar movimento recente no quadro.
- `Em foco` prioriza o que pede acao imediata e o que acabou de sair da fila.

Trade-off aceito:

- ganho: a interface mostra mais repertorio de produto e de apresentacao do mesmo dado;
- custo: aumenta a superficie visual e a necessidade de testes;
- mitigacao: a logica de filtro e CRUD continua unica; muda apenas a forma de renderizar o mesmo estado.

## Como Validar

Fluxo principal offline:

```bash
bash scripts/kata.sh kata2 all
```

Fluxo manual equivalente:

```bash
dotnet restore kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj
dotnet build kata-2/src/TaskBoard.Api/TaskBoard.Api.csproj --no-restore
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Api
npm --prefix kata-2/src/TaskBoard.Web run lint
npm --prefix kata-2/src/TaskBoard.Web run test
npm --prefix kata-2/src/TaskBoard.Web run build
```

Mapa detalhado das suites: `TESTES.md`.

Cobertura medida:

- backend (`src/TaskBoard.Api`): `100%` de cobertura de linha no codigo autoral;
- frontend (`src/TaskBoard.Web/src`): `100%` de statements, branches, functions e lines.

Observacao sobre a solution:

- `TaskBoard.sln` foi mantida para organizacao do projeto em IDE e navegacao.
- Neste ambiente de avaliacao, `dotnet build TaskBoard.sln` pode falhar por comportamento do SDK/workload resolver sem emitir diagnostico util; por isso a validacao automatizada usa os projetos diretamente.

Checagem opcional dependente de internet:

```bash
npm --prefix kata-2/src/TaskBoard.Web audit --audit-level=high
```

## Checklist da Entrega

Atende:

- API REST com os endpoints minimos;
- filtro por status;
- criacao, conclusao, atualizacao e exclusao de tarefas;
- respostas de erro padronizadas com `ProblemDetails`;
- endpoint de health check;
- documento OpenAPI;
- frontend consumindo a API;
- testes xUnit separados por escopo (`Backend` e `Api`);
- testes automatizados do frontend cobrindo carga inicial, filtro, troca de visualizacao e acoes principais;
- lint e typecheck do frontend;
- justificativa explicita da persistencia;
- fluxo unificado (`kata2 dev`) para subir backend + frontend em um comando, com fallback manual em dois terminais.

Limites conhecidos:

- persistencia apenas em memoria;
- escopo monousuario;
- sem autenticacao;
- sem banco duravel;
- sem teste end-to-end em navegador real.
