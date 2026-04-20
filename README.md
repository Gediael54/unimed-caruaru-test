# Teste Técnico Unimed Caruaru

## Candidato

- Nome completo: `Gediael Kallebe da Silva Andrade`
- Telefone de contato: `81993260372`
- E-mail: `gediael_kallebe@hotmail.com`

## Visão Geral

Este repositório contém quatro katas independentes para o teste técnico da Unimed Caruaru.

- `kata-1`: algoritmo de ordenação de fila de triagem.
- `kata-2`: quadro de tarefas com backend .NET Web API e frontend React/TypeScript.
- `kata-3`: análise técnica e plano de ação para um sistema legado.
- `kata-4`: pipeline de relatórios em CSV com saídas determinísticas.

## Stack(s) Utilizada(s)

- C# / .NET: usado no backend da Kata 2 para construir uma API HTTP com separação entre controller, serviço, repositório, DTOs e modelos.
- React + TypeScript: usado no frontend da Kata 2 para criar uma interface tipada, simples de evoluir e alinhada com a stack web solicitada.
- Python: usado nas Katas 1 e 4 para algoritmos, scripts, testes e processamento de dados com baixo overhead e sem dependências desnecessárias.
- Markdown: usado na Kata 3 porque a entrega solicitada é análise técnica, plano de ação e decisão de arquitetura.

### Justificativa da Escolha

- A Stack foi escolhida com o objetivo de se ter um diferencial tendo em vista que a stack utilizada pela Unimed é a mesma que está no teste, assim facilitando a avaliação e comparação.

## Qualidade, Testes e Segurança

O projeto foi organizado para ser fácil de revisar e executar localmente. A implementação prioriza:

- validação explícita de entradas;
- separação entre contratos, regras de negócio e persistência;
- testes unitários para regras isoladas;
- testes de integração para fluxos HTTP e pipeline de dados;
- dependências reduzidas para diminuir superfície de ataque;
- CORS restrito no backend da Kata 2;
- respostas de erro sem exposição de detalhes internos;
- estrutura de pastas separada por responsabilidade;
- nomenclatura consistente e legível;
- documentação de arquitetura, engenharia e segurança para a Kata 2.

Nenhum software pode prometer ausência absoluta de vulnerabilidades, mas a entrega busca reduzir riscos com controles simples, rastreáveis e compatíveis com o escopo do teste.

## Instruções Para Executar Cada Kata Localmente

### Kata 1

```bash
python3 -m unittest discover -s kata-1 -p 'test_*.py'
```

### Kata 2 - Backend

```bash
cd kata-2/backend
dotnet run --urls http://localhost:5000
```

A API expõe:

- `GET /tasks`
- `GET /tasks?status=pending`
- `GET /tasks?status=completed`
- `GET /tasks/{id}`
- `POST /tasks`
- `PATCH /tasks/{id}`
- `DELETE /tasks/{id}`

### Kata 2 - Frontend

```bash
cd kata-2/frontend
npm install
npm run dev
```

O frontend espera que o backend esteja rodando em `http://localhost:5000`.

### Kata 3

Leia o plano de ação em `kata-3/PLANO.md`.

### Kata 4

```bash
python3 kata-4/pipeline.py
python3 -m unittest discover -s kata-4 -p 'test_*.py'
```

O pipeline gera:

- `kata-4/output/consolidated.csv`
- `kata-4/output/indicators.json`

## Validação Completa

Depois de instalar as dependências do frontend, os comandos esperados são:

```bash
python3 -m unittest discover -s kata-1 -p 'test_*.py'
python3 kata-4/pipeline.py
python3 -m unittest discover -s kata-4 -p 'test_*.py'
dotnet build kata-2/backend/TaskBoard.Api.csproj
dotnet run --project kata-2/backend.tests/TaskBoard.Api.UnitTests.csproj
python3 -m unittest discover -s kata-2/tests -p 'test_*.py'
npm --prefix kata-2/frontend run build
npm --prefix kata-2/frontend audit --audit-level=high
```

## Comentários Livres: O Que Eu Faria Diferente Com Mais Tempo?

- Persistir as tarefas da Kata 2 em banco de dados em vez de repositório em memória.
- Adicionar autenticação e propriedade de tarefas para uso multiusuário.
- Adicionar relatórios estruturados separados para linhas rejeitadas na Kata 4.
- Adicionar medição formal de cobertura e gate mínimo no CI.
- Rodar auditoria de dependências no pipeline de integração contínua.
