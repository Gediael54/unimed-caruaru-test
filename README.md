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
- Na `kata-1`, Python foi mantido por ser a opção mais direta para algoritmo, regras de ordenação e testes de baixo overhead. A decisão privilegia clareza do raciocínio.
- Na `kata-2`, .NET foi usado onde ele agrega mais valor: API HTTP, separação em camadas, contratos e testes de integração.
- Na `kata-4`, Python volta a ser a escolha natural para parsing, normalização e consolidação de dados.

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

## Runner Unificado

Para facilitar a avaliação, o repositório agora inclui um runner único com menu interativo e modo direto por comando:

```bash
bash scripts/kata.sh
```

Sem argumentos, o script abre um menu com opções para `kata-1`, `kata-2`, `kata-4` e validação completa.

Exemplos de uso direto:

```bash
bash scripts/kata.sh kata1 verify
bash scripts/kata.sh kata2 backend-dev
bash scripts/kata.sh kata2 all
bash scripts/kata.sh kata4 all
bash scripts/kata.sh all validate
```

Comandos disponíveis no runner:

- `kata1 verify`: roda a validação completa resumida da Kata 1.
- `kata1 verify-verbose`: roda a validação completa detalhada da Kata 1.
- `kata1 tests`: roda a suíte de testes da Kata 1.
- `kata1 demo`: roda apenas os exemplos executáveis da Kata 1.
- `kata1 benchmark`: roda apenas a demonstração de escala e trade-offs da Kata 1, com projeções por ordens de grandeza.
- `kata2 backend-build`: compila o backend da Kata 2.
- `kata2 backend-dev`: sobe a API em `http://localhost:5000`.
- `kata2 backend-tests`: roda os testes unitários do backend.
- `kata2 api-tests`: roda os testes de integração da API.
- `kata2 frontend-install`: instala as dependências do frontend.
- `kata2 frontend-build`: gera o build do frontend.
- `kata2 frontend-audit`: roda a auditoria de dependências do frontend.
- `kata2 frontend-dev`: sobe o frontend em modo desenvolvimento.
- `kata2 all`: executa o fluxo principal de validação da Kata 2.
- `kata4 pipeline`: gera os artefatos do pipeline.
- `kata4 tests`: roda os testes da Kata 4.
- `kata4 all`: executa pipeline e testes da Kata 4.
- `all validate`: executa a validação principal de tudo que é automatizável sem subir os servidores de desenvolvimento.

Pré-requisitos do runner:

- `python3` para Katas 1 e 4 e para os testes de integração da Kata 2.
- `dotnet` para backend e testes da Kata 2.
- `npm` para frontend da Kata 2.

### Kata 1

```bash
python3 kata-1/verify.py
python3 kata-1/verify.py --mode full-verbose
python3 kata-1/verify.py --mode demo
python3 kata-1/verify.py --mode benchmark
python3 -m unittest discover -s kata-1 -p 'test_*.py'
```

O primeiro comando é a validação principal da entrega: ele roda testes, mede cobertura, valida o schema SQL, demonstra a equivalência entre Python e SQL e inclui benchmark ilustrativo. Na validação completa resumida, a parte de demonstração aparece em formato mais limpo para facilitar a leitura.

Essa mesma validação também foi automatizada em CI via GitHub Actions no workflow `.github/workflows/kata-1.yml`, que executa `bash scripts/kata.sh kata1 verify` em `push` e `pull_request`.

Os modos opcionais ajudam na apresentação:

- `--mode full-verbose`: roda a validação completa detalhada, mantendo a seção de demonstração no formato detalhado.
- `--mode demo`: mostra apenas a versão detalhada da demonstração, com cenários separados por regra de negócio, dados explícitos, resultado esperado, resultado obtido, empate exato, parsing flexível e paridade Python × SQL.
- `--mode benchmark`: mostra apenas a demonstração de escala e trade-offs, com projeções por ordens de grandeza.

No runner unificado, os equivalentes são:

- `bash scripts/kata.sh kata1 verify`: validação completa resumida
- `bash scripts/kata.sh kata1 verify-verbose`: validação completa detalhada
- `bash scripts/kata.sh kata1 demo`: somente demonstração detalhada

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

Depois de instalar as dependências do frontend, a forma mais simples de validar o repositório é:

```bash
bash scripts/kata.sh all validate
```

Fluxo manual equivalente:

```bash
bash scripts/kata.sh kata1 verify
dotnet build kata-2/backend/TaskBoard.Api.csproj
dotnet run --project kata-2/backend.tests/TaskBoard.Api.UnitTests.csproj
python3 -m unittest discover -s kata-2/tests -p 'test_*.py'
npm --prefix kata-2/frontend run build
npm --prefix kata-2/frontend audit --audit-level=high
python3 kata-4/pipeline.py
python3 -m unittest discover -s kata-4 -p 'test_*.py'
```

## Comentários Livres: O Que Eu Faria Diferente Com Mais Tempo?

- Persistir as tarefas da Kata 2 em banco de dados em vez de repositório em memória.
- Adicionar autenticação e propriedade de tarefas para uso multiusuário.
- Adicionar relatórios estruturados separados para linhas rejeitadas na Kata 4.
- Adicionar medição formal de cobertura e gate mínimo no CI.
- Rodar auditoria de dependências no pipeline de integração contínua.
