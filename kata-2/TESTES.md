# Kata 2 - Estrategia de Testes

Este arquivo descreve a cobertura esperada para a Kata 2 no recorte de
**robust MVP**.

## 1. Objetivo dos testes

Os testes devem provar tres coisas:

- o dominio do board e consistente;
- o contrato HTTP e previsivel;
- a UI permite operar o fluxo principal do workspace unico.

Como nao existe autenticacao real neste recorte, nao faz sentido gastar energia
em testes de login fake. A prioridade e validar o que o produto realmente
promete.

## 2. Backend - regras de dominio

Os testes unitarios do service/repositorio devem cobrir pelo menos:

- criacao com `title`, `description` e `priority` validos;
- `trim` e validacao de `title`;
- aceitacao de `description` vazia e rejeicao de payload fora do limite
  definido;
- validacao de `priority` em `low`, `medium`, `high`;
- validacao de `status` em `pending`, `in_progress`, `completed`, `cancelled`;
- transicoes de status permitidas pelo MVP;
- atualizacao parcial de `title`, `description`, `priority` e `status`;
- `DELETE` convertendo o card para arquivado em vez de apagamento definitivo;
- exclusao de cards arquivados da listagem padrao;
- resposta correta para IDs inexistentes;
- consistencia sob concorrencia local no repositório do workspace.

## 3. Contrato HTTP

Os testes de API devem garantir:

- `POST /tasks` retorna `201 Created` com payload completo do card;
- `GET /tasks` retorna somente cards ativos;
- `GET /tasks?status=...` filtra apenas valores validos;
- `PATCH /tasks/{id}` atualiza campos permitidos;
- `PATCH /tasks/{id}` rejeita `priority` ou `status` invalidos;
- `DELETE /tasks/{id}` retorna `204 No Content` e arquiva o card;
- operacoes com ID inexistente retornam `404 Not Found`;
- erros de validacao retornam `400 Bad Request`;
- `GET /health` e `GET /openapi/v1.json` continuam acessiveis.

## 4. Frontend

Os testes de UI devem cobrir o fluxo principal do board:

- renderizacao inicial do workspace;
- criacao de card com descricao e prioridade;
- movimentacao entre `pending`, `in_progress`, `completed` e `cancelled`;
- filtro por status;
- arquivamento via acao que dispara `DELETE`;
- remocao imediata do card da visao ativa apos arquivamento;
- exibicao de estados de loading e erro.

## 5. O que nao testar nesta fase

Fica explicitamente fora do escopo atual:

- login ou logout cenografico;
- permissao por papel;
- ownership por usuario;
- colaboracao em tempo real;
- reconciliacao de conflito entre sessoes autenticadas.

Se esses cenarios entrarem antes da arquitetura correspondente, os testes vao
passar a validar ficcao de produto, nao comportamento real.

## 6. Piramide recomendada

- base: testes unitarios de dominio;
- meio: testes de contrato HTTP;
- topo leve: testes de UI do fluxo principal.

Esse equilibrio e suficiente para o robust MVP porque o maior risco esta em
regra de board e contrato, nao em automacao E2E pesada.
