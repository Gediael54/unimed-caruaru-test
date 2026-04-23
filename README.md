# Teste Técnico Unimed Caruaru

## Candidato

- Nome completo: `Gediael Kallebe da Silva Andrade`
- Telefone de contato: `81993260372`
- E-mail: `gediael_kallebe@hotmail.com`

## Visão Geral

Este repositório contém quatro katas independentes para o teste técnico de desenvolvimento da Unimed Caruaru.

| Kata | Tema | Executar | Testar | Análise |
| --- | --- | --- | --- | --- |
| `kata-1` | Fila de triagem (saúde) | `bash scripts/kata.sh kata1 demo` | `bash scripts/kata.sh kata1 tests` | `kata-1/ANALISE.md` |
| `kata-2` | Painel de tarefas full-stack | `bash scripts/kata.sh kata2 dev` | `bash scripts/kata.sh kata2 all` | `kata-2/REQUISITOS.md`, `kata-2/ENGENHARIA.md`, `kata-2/TESTES.md` |
| `kata-3` | Sistema legado em colapso | — (documento) | — | `kata-3/PLANO.md` |
| `kata-4` | Pipeline de indicadores | `bash scripts/kata.sh kata4 pipeline` | `bash scripts/kata.sh kata4 tests` | `kata-4/ANALISE.md` |

Para avaliação, o caminho **recomendado** é começar pelo `showcase/`.
Ele foi construído como a porta de entrada do repositório para reduzir atrito
na revisão: concentra visão geral, documentação, comandos permitidos, retornos
de execução e pontos de navegação entre as katas. O terminal continua sendo a
fonte de verdade da execução, mas a leitura inicial recomendada é pelo
showcase.

## Stack(s) Utilizada(s)

- **C# / .NET** no backend da Kata 2, com separação em controller, serviço, repositório, DTOs e modelos.
- **React + TypeScript** no frontend da Kata 2, para interface tipada, alinhada com a stack sugerida pela equipe.
- **Python** nas Katas 1 e 4, pela adequação a algoritmos, scripts e processamento de dados.
- **Markdown** na Kata 3, porque a entrega pedida é análise técnica e plano de ação.

### Justificativa da Escolha

A stack segue a sugestão do enunciado (C# / .NET, React + TypeScript, Python) para que os projetos fiquem diretamente comparáveis ao ambiente real da equipe de TI da Unimed Caruaru.

- Na `kata-1`, Python mantém o foco em clareza do raciocínio e algoritmo.
- Na `kata-2`, .NET entrega API HTTP em camadas com contratos e testes de integração.
- Na `kata-4`, Python volta a ser a escolha natural para parsing, normalização e consolidação de dados.

### Organização Das Katas Em Python

Nas Katas 1 e 4, a implementação Python foi organizada no formato:

- `src/...`: código de domínio e aplicação;
- `tests/...`: suíte automatizada;
- `pyproject.toml`: metadados do projeto;
- wrappers finos na raiz do kata (`verify.py`, `explore.py`, `pipeline.py`, `triage.py`) para preservar os comandos documentados no runner, no README e no showcase.

Essa decisão resolve uma ambiguidade importante de apresentação: a lógica principal deixa de parecer um conjunto de scripts soltos e passa a ficar explícita como código de projeto. Ao mesmo tempo, os wrappers evitam retrabalho desnecessário no fluxo de avaliação já documentado.

Trade-off:

- ganho: a estrutura fica mais próxima de um projeto Python real;
- ganho: a implementação fica separada da camada de execução/manual;
- custo: existe uma camada extra de compatibilidade na raiz dos katas;
- custo: a navegação passa a ter mais arquivos do que a versão mais plana.

## Instruções para Executar Cada Kata Localmente

Há **três caminhos** para revisar e executar o projeto. A ordem recomendada é
esta:

1. **Showcase (recomendado para avaliação):** ponto de entrada visual do
   repositório.
2. **Runner interativo em terminal:** fluxo em `bash` (Linux/macOS/WSL/Git Bash) ou em `cmd` (Windows nativo), com menu, atalhos e identidade visual.
3. **Caminho manual por kata:** comandos diretos, explícitos e sem abstração.

Essa ordem foi escolhida de propósito para evitar que a camada de apresentação
se perca na leitura do repositório:

- o `showcase/` é a forma mais simples de entender rapidamente o conjunto da
  entrega;
- o runner é o segundo caminho recomendado para quem quer operar o projeto com
  suporte de menu e atalhos;
- o caminho manual fica documentado para quem prefere inspecionar e executar
  tudo diretamente.

O runner, o menu e o `bash scripts/kata.sh help` (ou `scripts\kata.cmd` no
Windows) marcam com `*` exatamente os comandos que atendem ao que o enunciado
pede. Todo item sem `*` é um extra que adicionei para facilitar a avaliação.

### Compatibilidade por Sistema Operacional

O repositório foi preparado para funcionar em três cenários: Unix-like, Git
Bash no Windows e Windows nativo sem dependência de `bash`. A tabela abaixo
resume o que usar em cada caso para os fluxos que o enunciado pede:

| Fluxo | Linux / macOS / WSL2 | Git Bash no Windows | CMD / PowerShell no Windows |
| --- | --- | --- | --- |
| Runner com menu visual | `bash scripts/kata.sh` | `bash scripts/kata.sh` | `scripts\kata.cmd` (sem menu interativo; passe escopo e ação) |
| Kata 1 — testes | `bash scripts/kata.sh kata1 tests` | mesmo comando | `scripts\kata.cmd kata1 tests` |
| Kata 1 — demo | `bash scripts/kata.sh kata1 demo` | mesmo comando | `scripts\kata.cmd kata1 demo` |
| Kata 2 — backend + frontend | `bash scripts/kata.sh kata2 dev` | mesmo comando | `scripts\kata.cmd kata2 dev` (abre duas janelas) ou `kata2 backend-dev` + `kata2 frontend-dev` em janelas separadas |
| Kata 2 — suite offline | `bash scripts/kata.sh kata2 all` | mesmo comando | `scripts\kata.cmd kata2 all` |
| Kata 4 — pipeline | `bash scripts/kata.sh kata4 pipeline` | mesmo comando | `scripts\kata.cmd kata4 pipeline` |
| Kata 4 — testes | `bash scripts/kata.sh kata4 tests` | mesmo comando | `scripts\kata.cmd kata4 tests` |
| Showcase — servir portal | `bash scripts/kata.sh showcase serve` | mesmo comando | `scripts\kata.cmd showcase serve` ou `showcase\start.cmd` |
| Showcase — testes | `bash scripts/kata.sh showcase tests` | mesmo comando | `scripts\kata.cmd showcase tests` ou `showcase\tests.cmd` |
| Validar tudo | `bash scripts/kata.sh all validate` | mesmo comando | `scripts\kata.cmd all validate` |

Diferenças a ter em mente:

- **Git Bash no Windows** consome o mesmo `scripts/kata.sh` usado em Linux/macOS/WSL e renderiza o visual completo (cores ANSI, menu interativo). É o caminho recomendado quando o avaliador estiver no Windows mas quiser a mesma experiência do terminal Unix-like.
- **CMD / PowerShell no Windows** usam `scripts\kata.cmd`, que é um equivalente funcional mas sem menu interativo: passe escopo e ação direto (`scripts\kata.cmd kata1 tests`). O fluxo unificado com health check (`kata2 dev`) em `bash` usa `trap` e `curl`; no `.cmd`, o equivalente apenas abre duas janelas separadas com backend e frontend — mantém a funcionalidade sem exigir shell POSIX.
- **Showcase** é a única camada que tem atalhos `.cmd` dedicados (`showcase\start.cmd`, `showcase\tests.cmd`), justamente para sustentar o cenário "avaliador sem `bash`".
- **Scripts Python das Katas 1 e 4** usam apenas `pathlib` e a stdlib, então rodam identicamente em Linux/macOS/Windows.

### Pré-requisitos

**Ferramentas de linha de comando:**

- `python3` — para Katas 1, 4 e showcase (no Windows, o instalador oficial disponibiliza tanto `python` quanto o launcher `py`; o runner detecta os dois).
- `dotnet` — para backend da Kata 2.
- `npm` — para frontend da Kata 2.
- `curl` — usado pelo comando unificado `kata2 dev` (apenas em `bash`) para aguardar o health check do backend. No Windows 10+ já vem embutido em `cmd`; em versões antigas, é opcional.

O menu principal (`bash scripts/kata.sh`) detecta e exibe a versão de cada ferramenta no topo, para confirmar o que está disponível antes de rodar. O `scripts\kata.cmd` falha explicitamente com mensagem clara quando uma ferramenta necessária não está no `PATH`.

### Showcase do Repositorio

O `showcase/` foi tratado como a **porta de entrada principal** do projeto para
fins de avaliação. Ele existe para facilitar a leitura do repositório sem
obrigar o avaliador a descobrir a ordem ideal de navegação por conta própria.

Ele separa três papéis:

- `documentação`: leitura passiva de contexto e análises em markdown;
- `execução real`: retorno real da API local do showcase para os comandos liberados;
- `exploração/benchmark`: camada visual de apoio, sem substituir o terminal.

Essa camada foi desenhada para ser o **caminho recomendado de revisão**, mas
sem alterar a fonte de verdade da execução: runner e comandos manuais continuam
sendo os mecanismos reais de operação.

Ela tambem **nao foi transformada em um segundo frontend React** de proposito:
o frontend que precisa ser avaliado como produto continua concentrado na
`kata-2/frontend`. Manter o showcase fora desse papel evita duplicar aplicacoes
web concorrentes no mesmo repositorio e reduz o risco de confundir
**infraestrutura de apresentacao** com **entrega full-stack da Kata 2**.

Regras desta vitrine:

- markdown é leitura passiva;
- só o catálogo whitelist executa ou reexecuta comandos;
- o benchmark da Kata 1 permanece disponível como exploração de escala;
- os outputs exibidos no terminal do showcase são retorno real da API local.

Declaração dedicada do papel dessa camada: `showcase/README.md`.

Fluxo recomendado para o avaliador:

1. abrir o showcase;
2. usar a navegação visual para entender o projeto, a documentação e os
   comandos liberados;
3. se quiser operar pelo terminal, seguir para o runner;
4. se quiser inspeção sem abstração, usar os comandos manuais por kata.

Como abrir o showcase:

```bash
bash scripts/kata.sh showcase serve
```

Ou manualmente:

```bash
python3 showcase/server.py
```

No Windows nativo:

```text
showcase\start.cmd
```

Validação da API local do showcase:

```bash
bash scripts/kata.sh showcase tests
```

Ou manualmente:

```bash
python3 -m unittest discover -s showcase -p 'test_*.py'
```

No Windows nativo:

```text
showcase\tests.cmd
```

Essa suíte cobre o backend local do showcase (`showcase/server.py`) e hoje fecha `100%` de cobertura desse arquivo.

Depois, abra:

```text
http://localhost:8787
```

### Runner Interativo em Terminal

Se a revisão sair do showcase e for para o terminal, o segundo caminho
recomendado é o runner:

```bash
bash scripts/kata.sh
```

Ele organiza os fluxos por kata, destaca o que é obrigatório no enunciado e
oferece atalhos para os extras de validação.

### Caminho Manual por Kata

Se a preferência for inspecionar e executar tudo sem menu nem abstração, os
comandos manuais por kata estão documentados nas seções abaixo.

### Kata 1 — Fila de Triagem

Estrutura atual da kata:

- implementação real em `kata-1/src/triage_queue/`;
- testes em `kata-1/tests/`;
- wrappers compatíveis na raiz (`kata-1/triage.py`, `kata-1/verify.py`, `kata-1/explore.py`);
- metadados do projeto em `kata-1/pyproject.toml`.

Comandos obrigatórios pelo enunciado:

```bash
# Testes unitários (Parte A)
python3 -m unittest discover -s kata-1 -p 'test_*.py'

# Demonstração do algoritmo (Parte A)
python3 kata-1/verify.py --mode demo
```

Equivalentes pelo runner:

```bash
bash scripts/kata.sh kata1 tests   # obrigatório
bash scripts/kata.sh kata1 demo    # obrigatório
```

No Windows nativo (sem Git Bash):

```text
scripts\kata.cmd kata1 tests
scripts\kata.cmd kata1 demo
```

Extras adicionados para a revisão:

```bash
bash scripts/kata.sh kata1 verify           # validação completa resumida
bash scripts/kata.sh kata1 verify-verbose   # validação completa detalhada
bash scripts/kata.sh kata1 benchmark        # projeção de escala
bash scripts/kata.sh kata1 explore          # explorer interativo de casos e volume
```

Os mesmos extras ficam disponíveis em Windows nativo trocando `bash scripts/kata.sh` por `scripts\kata.cmd`.

Análise escrita: `kata-1/ANALISE.md`. Esquema SQL opcional: `kata-1/schema.sql`.

### Kata 2 — Painel de Tarefas

A Kata 2 foi tratada como um **robust MVP** de board interno: autenticacao simulada na borda do produto, ciclo de status mais realista (`pending`, `in_progress`, `completed`, `cancelled`, `archived`), arquivamento via `soft delete`, descricao estruturada de card e multiplas leituras visuais do mesmo estado. Há três formas de executar backend e frontend juntos — o enunciado é atendido por qualquer uma, escolha a que preferir:

#### Forma 1 · um comando (fluxo unificado)

```bash
bash scripts/kata.sh kata2 dev
```

Esse comando:

- sobe o backend em `http://localhost:5000` em segundo plano, redirecionando logs para `kata-2/artifacts/logs/backend.log`;
- aguarda `/health` responder (timeout de 60s);
- sobe o frontend em `http://localhost:5173` em primeiro plano;
- ao pressionar `Ctrl+C`, encerra automaticamente o backend via `trap`.

**Trade-offs do fluxo unificado:**

- precisa de `curl` no ambiente (usado só para o health check);
- logs do backend não aparecem na tela; ficam no arquivo `kata-2/artifacts/logs/backend.log`;
- se outro processo já estiver ouvindo nas portas 5000 ou 5173, o comando falha na inicialização do serviço correspondente — use a Forma 2 para diagnosticar;
- se o backend cair fora do controle do script, o `trap` de `Ctrl+C` ainda encerra o processo principal, mas pode sobrar o log gerado em disco.

#### Forma 2 · dois terminais (tradicional, o que o enunciado pressupõe)

Terminal 1 (backend):

```bash
dotnet run --project kata-2/backend/TaskBoard.Api.csproj --urls http://localhost:5000
```

Terminal 2 (frontend):

```bash
cd kata-2/frontend
npm install   # só na primeira execução
npm run dev
```

Equivalentes via runner:

```bash
bash scripts/kata.sh kata2 backend-dev    # Terminal 1
bash scripts/kata.sh kata2 frontend-dev   # Terminal 2
```

#### Forma 3 · menu interativo

```bash
bash scripts/kata.sh
```

No menu principal, escolha `[1] Kata 2 · backend + frontend em um comando`, ou entre no submenu da Kata 2 com `[b]`.

#### Forma 4 · Windows nativo sem `bash`

```text
scripts\kata.cmd kata2 dev
```

Esse comando abre duas janelas separadas (uma com `dotnet run`, outra com `npm run dev`). Alternativas manuais:

```text
scripts\kata.cmd kata2 backend-dev
scripts\kata.cmd kata2 frontend-dev
```

Trade-off do `.cmd`: o `trap` e o health check via `curl` do fluxo `bash` não existem em CMD puro; abrir janelas separadas preserva os dois serviços independentes e deixa os logs visíveis. Se o avaliador quiser a experiência completa (cores, menu, health check) no Windows, basta usar Git Bash.

#### Endpoints expostos pelo backend

- `GET /tasks`
- `GET /tasks?status=pending|in_progress|completed|cancelled|archived`
- `GET /tasks/{id}`
- `GET /health`
- `GET /openapi/v1.json`
- `POST /tasks`
- `PATCH /tasks/{id}`
- `DELETE /tasks/{id}`

#### Validação offline (testes + lint + builds)

```bash
bash scripts/kata.sh kata2 all
```

Ou manualmente:

```bash
dotnet restore kata-2/backend.tests/TaskBoard.Api.Tests.csproj
dotnet build kata-2/backend/TaskBoard.Api.csproj --no-restore
dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend
dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Api
npm --prefix kata-2/frontend run lint
npm --prefix kata-2/frontend run test
npm --prefix kata-2/frontend run build
```

Checagem opcional (depende de internet):

```bash
npm --prefix kata-2/frontend audit --audit-level=high
```

Documentos da Kata 2:

- `kata-2/REQUISITOS.md` — Parte A (análise de requisitos).
- `kata-2/README.md` — Partes B e C (backend, frontend e persistência).
- `kata-2/ENGENHARIA.md` — Parte D (decisões de arquitetura e evolução).

Estrutura adotada na Kata 2:

- `kata-2/backend` — backend .NET
- `kata-2/frontend` — frontend React/TypeScript
- `kata-2/backend.tests` — testes do backend e contrato HTTP
- `kata-2/artifacts` — saídas geradas localmente, separadas do código-fonte

Também adicionei quatro modos de visualização na UI (`lista`, `kanban`, `timeline` e `em foco`) como extra de apresentação do mesmo estado, sem mudar o contrato da API nem o fluxo principal do MVP. O `kanban` recebeu uma leitura mais próxima de board operacional estilo Trello, mas com identidade visual própria da entrega.

### Kata 3 — Sistema Legado em Colapso

Não há código a executar. Leia o plano de ação:

- `kata-3/PLANO.md` — diagnóstico, plano de ação, decisão de arquitetura e análise de RNFs.

### Kata 4 — Pipeline de Indicadores

Estrutura atual da kata:

- implementação real em `kata-4/src/report_pipeline/`;
- testes em `kata-4/tests/`;
- wrapper compatível na raiz em `kata-4/pipeline.py`;
- metadados do projeto em `kata-4/pyproject.toml`.

Comandos obrigatórios pelo enunciado:

```bash
# Pipeline (Parte A + B)
python3 kata-4/pipeline.py

# Testes (parte da avaliação de qualidade)
python3 -m unittest discover -s kata-4 -p 'test_*.py'
```

Equivalentes pelo runner:

```bash
bash scripts/kata.sh kata4 pipeline   # obrigatório
bash scripts/kata.sh kata4 tests      # obrigatório
```

No Windows nativo (sem Git Bash):

```text
scripts\kata.cmd kata4 pipeline
scripts\kata.cmd kata4 tests
```

O pipeline gera:

- `kata-4/output/consolidated.csv`
- `kata-4/output/indicators.json`

Análise escrita: `kata-4/ANALISE.md`.

## Validação Completa do Repositório

Forma mais curta — executa as suítes automatizáveis das Katas 1, 2 e 4:

```bash
bash scripts/kata.sh all validate
```

No Windows nativo (sem Git Bash):

```text
scripts\kata.cmd all validate
```

Fluxo manual equivalente:

```bash
python3 kata-1/verify.py
dotnet restore kata-2/backend.tests/TaskBoard.Api.Tests.csproj
dotnet build kata-2/backend/TaskBoard.Api.csproj --no-restore
dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend
dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Api
npm --prefix kata-2/frontend run lint
npm --prefix kata-2/frontend run test
npm --prefix kata-2/frontend run build
python3 kata-4/pipeline.py
python3 -m unittest discover -s kata-4 -p 'test_*.py'
```

Todos os caminhos também estão automatizados em CI via GitHub Actions:

- `.github/workflows/kata-1.yml` — `bash scripts/kata.sh kata1 verify`
- `.github/workflows/kata-2.yml` — `bash scripts/kata.sh kata2 all`
- `.github/workflows/kata-4.yml` — `bash scripts/kata.sh kata4 all`

## Qualidade, Testes e Segurança

A implementação prioriza:

- validação explícita de entradas;
- separação entre contratos, regras de negócio e persistência;
- testes unitários para regras isoladas;
- testes de integração para fluxos HTTP e pipeline de dados;
- dependências reduzidas para diminuir superfície de ataque;
- CORS restrito no backend da Kata 2;
- respostas de erro sem exposição de detalhes internos;
- estrutura de pastas por responsabilidade;
- nomenclatura consistente em inglês no código e português nos documentos do avaliador;
- documentação de arquitetura e engenharia para a Kata 2.

Nenhum software pode prometer ausência absoluta de vulnerabilidades, mas a entrega busca reduzir riscos com controles simples, rastreáveis e compatíveis com o escopo do teste.

## Comentários Livres: O Que Eu Faria Diferente Com Mais Tempo?

- Persistir as tarefas da Kata 2 em banco de dados em vez de repositório em memória.
- Adicionar autenticação e propriedade de tarefas para uso multiusuário.
- Relatórios estruturados separados para linhas rejeitadas na Kata 4.
- Medição formal de cobertura com gate mínimo no CI.
- Auditoria de dependências no pipeline de integração contínua.
- Teste end-to-end em navegador real para a Kata 2 (Playwright ou Cypress).
