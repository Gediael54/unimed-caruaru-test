# Kata 2 - Board Profissional

## Papel Deste README

Este README e o guia local da Kata 2. Ele concentra:

- o que a kata entrega como produto;
- o que precisa ser instalado para rodar;
- como subir backend e frontend;
- como validar a parte .NET e a parte React;
- qual documento ler em seguida.

As discussoes mais densas ficam fora daqui:

- `REQUISITOS.md` para produto e escopo;
- `ENGENHARIA.md` para arquitetura e evolucao;
- `TESTES.md` para estrategia de validacao.

## Ordem Recomendada De Leitura

1. este `README.md` para setup, estrutura e comandos;
2. `REQUISITOS.md` para o contrato do board;
3. `ENGENHARIA.md` para as decisoes de modelagem;
4. `TESTES.md` para a estrategia de qualidade;
5. `backend/`, `frontend/` e `backend.tests/` para o codigo.

## O Que Esta Kata Entrega

A Kata 2 foi tratada como um board interno em formato de robust MVP:

- um unico workspace;
- sem autenticacao real;
- sem ownership por usuario;
- cards com `title`, `description`, `priority` e `status`;
- arquivamento via `soft delete`;
- frontend com multiplas leituras visuais do mesmo estado;
- backend HTTP com contrato claro e testes.

O objetivo aqui e provar produto, contrato e evolucao arquitetural sem encenar colaboracao que o sistema ainda nao sustenta.

## O Que Precisa Baixar

Para rodar a Kata 2:

- `.NET SDK 10`
- `Node.js 22 LTS` ou `Node.js 20.19+`
- `npm`
- `curl`
  - necessario apenas para o fluxo unificado em `bash` (`kata2 dev`);
  - no Windows nativo ele nao e necessario para o runner `.cmd`.

## Setup Antes Da Primeira Execucao

Na raiz do repositorio:

```bash
dotnet restore kata-2/backend.tests/TaskBoard.Api.Tests.csproj
npm --prefix kata-2/frontend install
```

Esses dois comandos resolvem o setup local da kata:

- o primeiro baixa os pacotes .NET do backend e dos testes;
- o segundo baixa as dependencias do frontend React/TypeScript.

Antes de subir ou validar a kata, confirme:

```bash
dotnet --version
node --version
npm --version
```

No Windows, se o runner reclamar de dependencia ausente no frontend ou de restore .NET pendente, ele agora informa exatamente qual comando rodar.

## Estrutura Da Pasta

- `backend/`
  - API .NET;
- `backend.tests/`
  - testes de regra, contrato HTTP e infraestrutura;
- `frontend/`
  - aplicacao React + TypeScript;
- `artifacts/`
  - saidas locais como logs, coverage e build do frontend;
- `REQUISITOS.md`
  - escopo e contrato do produto;
- `ENGENHARIA.md`
  - decisoes de arquitetura;
- `TESTES.md`
  - estrategia de validacao.

## Como Rodar

### Opcao 1 - Runner Unificado Em Bash

```bash
bash scripts/kata.sh kata2 dev
```

Esse fluxo:

- sobe o backend em `http://localhost:5000`;
- espera `/health` responder;
- sobe o frontend em `http://localhost:5173`;
- grava log do backend em `kata-2/artifacts/logs/backend.log`.

Use esta opcao em Linux, macOS, WSL ou Git Bash.

### Opcao 2 - Dois Terminais

Backend:

```bash
dotnet run --project kata-2/backend/TaskBoard.Api.csproj --urls http://localhost:5000
```

Frontend:

```bash
npm --prefix kata-2/frontend run dev
```

### Opcao 3 - Windows Nativo Sem Bash

```text
scripts\kata.cmd kata2 dev
```

No Windows nativo esse comando abre duas janelas separadas: uma para o backend e outra para o frontend.

Se preferir abrir manualmente:

```text
scripts\kata.cmd kata2 backend-dev
scripts\kata.cmd kata2 frontend-dev
```

Se o frontend ainda nao tiver dependencias locais, rode antes:

```text
scripts\kata.cmd kata2 frontend-install
```

## Endpoints Principais

- `GET /tasks`
- `GET /tasks?status=pending|in_progress|completed|cancelled|archived`
- `GET /tasks/{id}`
- `POST /tasks`
- `PATCH /tasks/{id}`
- `DELETE /tasks/{id}`
- `GET /health`
- `GET /openapi/v1.json`

## Validacao

### Runner

```bash
bash scripts/kata.sh kata2 all
```

Windows nativo:

```text
scripts\kata.cmd kata2 all
```

### Manual

```bash
dotnet restore kata-2/backend.tests/TaskBoard.Api.Tests.csproj
dotnet build kata-2/backend/TaskBoard.Api.csproj --no-restore
dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend
dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Api
npm --prefix kata-2/frontend install
npm --prefix kata-2/frontend run lint
npm --prefix kata-2/frontend run test
npm --prefix kata-2/frontend run build
```

## O Que Ler Depois Deste README

- `REQUISITOS.md`
  - escopo assumido, contrato do board e limites intencionais;
- `ENGENHARIA.md`
  - modelagem, trade-offs e evolucao;
- `TESTES.md`
  - cobertura, fluxos validados e criterio de revisao.
