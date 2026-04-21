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

Há **dois caminhos** e ambos cobrem tudo que o enunciado pede. Escolha o que preferir:

1. **Caminho interativo (recomendado):** runner com menu e identidade visual Unimed.
   ```bash
   bash scripts/kata.sh
   ```
2. **Caminho manual:** comandos diretos por kata (detalhados abaixo).

O runner, o menu e o `bash scripts/kata.sh help` marcam com `*` exatamente os comandos que atendem ao que o enunciado pede. Todo item sem `*` é um extra que adicionei para facilitar a avaliação.

Há também um **terceiro caminho opcional**, que não substitui os dois acima: uma vitrine web do repositório em `showcase/`, pensada apenas para apresentação do conjunto.

### Pré-requisitos

**Terminal compatível.** O runner usa `bash`, códigos ANSI de cor e UTF-8. Compatível com:

- Linux, macOS e WSL2 — qualquer terminal moderno funciona (GNOME Terminal, iTerm2, Alacritty, Windows Terminal + WSL, etc.).
- Windows nativo — use **WSL2** ou **Git Bash**. `cmd.exe` e PowerShell não renderizam o visual corretamente e podem quebrar comandos bash.

**Ferramentas de linha de comando:**

- `python3` — para Katas 1 e 4.
- `dotnet` — para backend da Kata 2.
- `npm` — para frontend da Kata 2.
- `curl` — usado pelo comando unificado `kata2 dev` para aguardar o health check do backend.

O menu principal (`bash scripts/kata.sh`) detecta e exibe a versão de cada ferramenta no topo, para confirmar o que está disponível antes de rodar.

### Vitrine Web Opcional do Projeto

Esta camada foi adicionada como **extra de apresentação**. Ela não faz parte do que o enunciado exige, e por isso não substitui:

- o runner em `bash`;
- os comandos manuais por kata.

Objetivo da vitrine:

- resumir o que foi entregue;
- mostrar rapidamente onde está cada análise;
- apresentar os caminhos de execução e os trade-offs sem misturar isso ao produto da Kata 2;
- oferecer uma camada visual de exploração da Kata 1 sem substituir o terminal como fonte de verdade.

A vitrine começou como um showcase estático. Depois, a simulação de volume da Kata 1 fez a arquitetura evoluir: até `2.000` pacientes a medição roda no navegador; acima disso, a UI passa a usar uma API local própria do showcase para processar o trabalho em background e sincronizar o contador de progresso com o retorno do job.

Trade-offs dessa evolução:

- ganho: a interface continua fluida mesmo em volumes maiores;
- ganho: a experiência fica com mais cara de execução real, e não só de página estática;
- custo: o showcase deixa de ser apenas arquivos estáticos;
- custo: a execução manual passa a usar `python3 showcase/server.py` em vez de um `http.server` puro.

Como executar:

```bash
bash scripts/kata.sh showcase serve
```

Ou manualmente:

```bash
python3 showcase/server.py
```

Validação da API local do showcase:

```bash
bash scripts/kata.sh showcase tests
```

Ou manualmente:

```bash
python3 -m unittest discover -s showcase -p 'test_*.py'
```

Essa suíte cobre o backend local da vitrine (`showcase/server.py`) e hoje fecha `100%` de cobertura desse arquivo.

Depois, abra:

```text
http://localhost:8787
```

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

A Kata 2 precisa de backend e frontend rodando ao mesmo tempo. Há três formas de fazer isso — o enunciado é atendido por qualquer uma, escolha a que preferir:

#### Forma 1 · um comando (fluxo unificado)

```bash
bash scripts/kata.sh kata2 dev
```

Esse comando:

- sobe o backend em `http://localhost:5000` em segundo plano, redirecionando logs para `kata-2/.logs/backend.log`;
- aguarda `/health` responder (timeout de 60s);
- sobe o frontend em `http://localhost:5173` em primeiro plano;
- ao pressionar `Ctrl+C`, encerra automaticamente o backend via `trap`.

**Trade-offs do fluxo unificado:**

- precisa de `curl` no ambiente (usado só para o health check);
- logs do backend não aparecem na tela; ficam no arquivo `kata-2/.logs/backend.log`;
- se outro processo já estiver ouvindo nas portas 5000 ou 5173, o comando falha na inicialização do serviço correspondente — use a Forma 2 para diagnosticar;
- se o backend cair fora do controle do script, o `trap` de `Ctrl+C` ainda encerra o processo principal, mas pode sobrar o log gerado em disco.

#### Forma 2 · dois terminais (tradicional, o que o enunciado pressupõe)

Terminal 1 (backend):

```bash
dotnet run --project kata-2/src/TaskBoard.Api/TaskBoard.Api.csproj --urls http://localhost:5000
```

Terminal 2 (frontend):

```bash
cd kata-2/src/TaskBoard.Web
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
- `GET /tasks?status=pending`
- `GET /tasks?status=completed`
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
dotnet restore kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj
dotnet build kata-2/src/TaskBoard.Api/TaskBoard.Api.csproj --no-restore
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Api
npm --prefix kata-2/src/TaskBoard.Web run lint
npm --prefix kata-2/src/TaskBoard.Web run test
npm --prefix kata-2/src/TaskBoard.Web run build
```

Checagem opcional (depende de internet):

```bash
npm --prefix kata-2/src/TaskBoard.Web audit --audit-level=high
```

Documentos da Kata 2:

- `kata-2/REQUISITOS.md` — Parte A (análise de requisitos).
- `kata-2/README.md` — Partes B e C (backend, frontend e persistência).
- `kata-2/ENGENHARIA.md` — Parte D (decisões de arquitetura e evolução).

Estrutura adotada na Kata 2:

- `kata-2/src/TaskBoard.Api` — backend .NET
- `kata-2/src/TaskBoard.Web` — frontend React/TypeScript
- `kata-2/tests/TaskBoard.Api.Tests` — testes do backend e contrato HTTP

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
dotnet restore kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj
dotnet build kata-2/src/TaskBoard.Api/TaskBoard.Api.csproj --no-restore
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend
dotnet test kata-2/tests/TaskBoard.Api.Tests/TaskBoard.Api.Tests.csproj --filter Scope=Api
npm --prefix kata-2/src/TaskBoard.Web run lint
npm --prefix kata-2/src/TaskBoard.Web run test
npm --prefix kata-2/src/TaskBoard.Web run build
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
