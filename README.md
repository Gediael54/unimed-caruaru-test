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

## Instruções para Executar Cada Kata Localmente

Há **três caminhos** para revisar e executar o projeto. A ordem recomendada é
esta:

1. **Showcase (recomendado para avaliação):** ponto de entrada visual do
   repositório.
2. **Runner interativo em terminal:** fluxo em `bash` com menu, atalhos e
   identidade visual.
3. **Caminho manual por kata:** comandos diretos, explícitos e sem abstração.

Essa ordem foi escolhida de propósito para evitar que a camada de apresentação
se perca na leitura do repositório:

- o `showcase/` é a forma mais simples de entender rapidamente o conjunto da
  entrega;
- o runner em `bash` é o segundo caminho recomendado para quem quer operar o
  projeto com suporte de menu e atalhos;
- o caminho manual fica documentado para quem prefere inspecionar e executar
  tudo diretamente.

O runner, o menu e o `bash scripts/kata.sh help` marcam com `*` exatamente os
comandos que atendem ao que o enunciado pede. Todo item sem `*` é um extra que
adicionei para facilitar a avaliação.

### Pré-requisitos

**Terminal compatível.** O runner usa `bash`, códigos ANSI de cor e UTF-8. Compatível com:

- Linux, macOS e WSL2 — qualquer terminal moderno funciona (GNOME Terminal, iTerm2, Alacritty, Windows Terminal + WSL, etc.).
- Windows nativo — use **WSL2** ou **Git Bash**. `cmd.exe` e PowerShell não renderizam o visual corretamente e podem quebrar comandos bash.

**Importante para Windows:** essa limitação vale para o runner em `bash`. O
`showcase/` pode ser aberto de forma nativa no Windows, sem Git Bash nem WSL,
pelos atalhos `showcase\start.cmd` e `showcase\tests.cmd`.

**Ferramentas de linha de comando:**

- `python3` — para Katas 1 e 4.
- `dotnet` — para backend da Kata 2.
- `npm` — para frontend da Kata 2.
- `curl` — usado pelo comando unificado `kata2 dev` para aguardar o health check do backend.

O menu principal (`bash scripts/kata.sh`) detecta e exibe a versão de cada ferramenta no topo, para confirmar o que está disponível antes de rodar.

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

Extras adicionados para a revisão:

```bash
bash scripts/kata.sh kata1 verify           # validação completa resumida
bash scripts/kata.sh kata1 verify-verbose   # validação completa detalhada
bash scripts/kata.sh kata1 benchmark        # projeção de escala
bash scripts/kata.sh kata1 explore          # explorer interativo de casos e volume
```

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

O pipeline gera:

- `kata-4/output/consolidated.csv`
- `kata-4/output/indicators.json`

Análise escrita: `kata-4/ANALISE.md`.

## Validação Completa do Repositório

Forma mais curta — executa as suítes automatizáveis das Katas 1, 2 e 4:

```bash
bash scripts/kata.sh all validate
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
