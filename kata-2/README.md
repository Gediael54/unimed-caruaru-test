# Kata 2 - Board Profissional (Robust MVP)

## Visao geral

Esta documentacao posiciona a Kata 2 como um **robust MVP** de board
profissional. O sistema continua intencionalmente simples em infraestrutura, mas
deixa de ser uma todo-list basica.

Escopo assumido:

- um unico workspace;
- nenhuma autenticacao real;
- nenhum conceito de time, papel ou permissao;
- cards com `title`, `description`, `priority` e `status`;
- `DELETE` como arquivamento (`soft delete`), nao como exclusao definitiva.

O foco do MVP e provar boa modelagem de board, contrato claro e evolucao
arquitetural consistente, sem encenar colaboracao que o produto ainda nao
sustenta.

## Contrato funcional esperado

### Campos principais do card

- `id`
- `title`
- `description`
- `priority`: `low`, `medium`, `high`
- `status`: `pending`, `in_progress`, `completed`, `cancelled`
- timestamps tecnicos de criacao/atualizacao
- marcador de arquivamento para suportar `soft delete`

### Operacoes do board

- `GET /tasks`: lista cards ativos do workspace;
- `GET /tasks?status=...`: filtra cards ativos por status;
- `GET /tasks/{id}`: consulta um card especifico;
- `POST /tasks`: cria card novo;
- `PATCH /tasks/{id}`: atualiza `title`, `description`, `priority` e `status`;
- `DELETE /tasks/{id}`: arquiva o card e remove do board ativo;
- `GET /health`: health check tecnico;
- `GET /openapi/v1.json`: contrato OpenAPI.

## O que mudou em relacao ao MVP antigo

O antigo recorte de "listar, criar, concluir e apagar" nao e suficiente para um
board profissional. O robust MVP passa a exigir:

- descricao para dar contexto ao trabalho;
- prioridade para triagem real;
- ciclo de status mais completo;
- arquivamento em vez de exclusao destrutiva;
- documentacao honesta sobre o que ainda nao entrou.

Isso entrega evolucao seria de produto sem inflar a kata com subsistemas
laterais.

## Limite arquitetural intencional

Autenticacao, multiusuario, ownership por tarefa, times e permissao **nao**
foram omitidos por descuido. Eles ficam fora porque representam uma nova fase de
arquitetura:

- exigem identidade confiavel;
- mudam o modelo de dados;
- alteram o contrato HTTP;
- introduzem autorizacao, auditoria e concorrencia entre sessoes.

Enquanto isso nao existe de verdade, o sistema fica melhor documentado como
single-workspace do que com um login ficticio.

## Por que nao adicionar login fake

Login fake seria pior que esta documentacao por tres razoes praticas:

- adiciona atrito de UX sem isolar dados nem proteger operacoes;
- mascara a ausencia de ownership e permissao reais;
- desloca o esforco para uma camada cenografica, em vez de fortalecer o board.

Em outras palavras: um board serio sem auth ainda e um MVP honesto; um board
sem auth travestido de app autenticado e apenas mais confuso.

## Como executar

Backend e frontend continuam rodando separadamente no ambiente local.

Backend:

```bash
dotnet run --project kata-2/backend/TaskBoard.Api.csproj --urls http://localhost:5000
```

Frontend:

```bash
cd kata-2/frontend
npm install
npm run dev
```

## Leitura complementar

- `REQUISITOS.md`: contrato de produto e justificativas de escopo;
- `ENGENHARIA.md`: racional arquitetural do robust MVP e proxima fase;
- `TESTES.md`: estrategia de testes esperada para esse recorte.
