# Teste Técnico Unimed Caruaru

## Candidato

- Nome completo: `Gediael Kallebe da Silva Andrade`
- Telefone: `81993260372`
- E-mail: `gediael_kallebe@hotmail.com`

## Como Ler Este Repositorio

Este README e o mapa do repositorio. Ele responde quatro perguntas:

1. o que existe em cada pasta;
2. o que precisa baixar para rodar;
3. quais comandos principais usar;
4. qual documento ler em seguida em cada escopo.

Leitura recomendada:

1. `README.md` para entender o mapa geral e preparar o ambiente;
2. `showcase/README.md` se a revisao vai comecar pela vitrine visual;
3. `kata-1/README.md`, `kata-2/README.md` e `kata-4/README.md` para execucao e leitura tecnica de cada entrega;
4. `kata-3/PLANO.md` para a parte documental;
5. `ANALISE.md`, `REQUISITOS.md`, `ENGENHARIA.md` e `TESTES.md` apenas quando quiser aprofundar.

## Mapa Rapido

| Escopo | O que entrega | Comece por | Comando principal |
| --- | --- | --- | --- |
| `showcase/` | Portal visual do repositorio | `showcase/README.md` | `bash scripts/kata.sh showcase serve` ou `scripts\kata.cmd showcase serve` |
| `kata-1/` | Fila de triagem em Python | `kata-1/README.md` | `bash scripts/kata.sh kata1 demo` |
| `kata-2/` | Board full-stack (.NET + React/TS) | `kata-2/README.md` | `bash scripts/kata.sh kata2 dev` |
| `kata-3/` | Plano tecnico de recuperacao | `kata-3/PLANO.md` | sem execucao |
| `kata-4/` | Pipeline de indicadores em Python | `kata-4/README.md` | `bash scripts/kata.sh kata4 pipeline` |
| `scripts/` | Runners do projeto | este README + `help` | `bash scripts/kata.sh help` ou `scripts\kata.cmd help` |

## O Que Precisa Baixar

Para rodar o repositorio completo localmente:

- `Python 3.11+`
  - usado em `kata-1`, `kata-4` e `showcase`;
  - no Windows, recomendo instalar o Python 3.12 x64 pelo instalador oficial;
- `.NET SDK 10`
  - usado no backend e nos testes da `kata-2`;
- `Node.js`
  - recomendo `Node.js 24.14.0` para ficar igual ao CI, ou `Node.js 22.13+`;
  - o frontend da `kata-2` depende de uma versao compativel com `Vite 7`;
- `npm`
  - normalmente ja vem junto com o Node.js;
- `Git Bash` ou `WSL` no Windows
  - opcional;
  - recomendado se voce quiser usar exatamente os mesmos comandos documentados no repositório e no showcase;
  - a principal vantagem e liberar o runner completo em `bash`, com menu interativo, cores e o fluxo integrado da `kata-2`;
  - sem isso, o projeto continua executavel com `scripts\kata.cmd`, mas como fallback funcional e sem o mesmo nivel de experiencia do runner principal.

## Como Confirmar O Ambiente

Antes de rodar qualquer kata, confirme se as ferramentas ficaram disponiveis no terminal atual.

Windows nativo:

```text
python --version
py -3 --version
dotnet --version
node --version
npm --version
where python
where py
```

Linux, macOS ou WSL:

```bash
python3 --version
dotnet --version
node --version
npm --version
```

Git Bash no Windows:

```bash
python --version
python3 --version
dotnet --version
node --version
npm --version
```

No Git Bash, use o comando Python que existir no seu `PATH`; o runner tenta `python3` e depois `python`.

## Setup Minimo Antes De Rodar

Depois de instalar as ferramentas:

```bash
dotnet restore kata-2/backend.tests/TaskBoard.Api.Tests.csproj
npm --prefix kata-2/frontend ci
```

Esses dois passos cobrem os downloads locais do repositorio:

- `dotnet restore` baixa os pacotes do backend/testes da `kata-2`;
- `npm ci` baixa as dependencias do frontend da `kata-2` exatamente como no `package-lock.json`.

As Katas 1 e 4 usam `stdlib` + estrutura Python local; nao exigem `pip install`.

## Notas Rapidas Para Windows

- Se voce acabou de instalar Python e `python --version` ou `py -3 --version` ainda falham:
  - feche o `cmd.exe` ou PowerShell;
  - abra um terminal novo;
  - teste de novo;
  - se ainda falhar, rode `where python` e `where py`;
  - confirme se a pasta do Python entrou no `PATH`.
- Se quiser a experiencia completa do runner com menu e cores, use `Git Bash` e rode `bash scripts/kata.sh`.
- Se quiser ficar em `cmd.exe` ou PowerShell, use `scripts\kata.cmd`.
- Os runners agora falham cedo quando falta ferramenta, `npm ci` da `kata-2/frontend` ou `dotnet restore` da `kata-2`, e informam o comando exato para corrigir.

Vantagens praticas de usar `bash`/Git Bash no Windows:

- voce executa os mesmos comandos que aparecem na documentacao e no showcase, sem conversao para `.cmd`;
- o runner ganha menu interativo, identidade visual e ajuda completa em uma unica entrada;
- o `kata2 dev` sobe backend + frontend no mesmo fluxo, espera o `/health` e encerra o backend junto quando voce fecha o processo.
- tambem vale abrir o runner em `bash` para revisar a propria orquestracao da entrega, ja que o menu e os fluxos mostram como a execucao foi pensada.

## Formas De Executar

### 1. Showcase

Para revisar primeiro pela vitrine visual:

```bash
bash scripts/kata.sh showcase serve
```

Windows nativo:

```text
scripts\kata.cmd showcase serve
showcase\start.cmd
```

Depois abra `http://localhost:8787`.

### 2. Runner

Linux, macOS, WSL ou Git Bash:

```bash
bash scripts/kata.sh
bash scripts/kata.sh help
```

Windows nativo:

```text
scripts\kata.cmd help
```

### 3. Comandos Principais

Linux, macOS, WSL ou Git Bash:

```bash
bash scripts/kata.sh kata1 tests
bash scripts/kata.sh kata1 demo
bash scripts/kata.sh kata2 dev
bash scripts/kata.sh kata2 all
bash scripts/kata.sh kata4 pipeline
bash scripts/kata.sh kata4 tests
bash scripts/kata.sh all validate
```

Windows nativo:

```text
scripts\kata.cmd kata1 tests
scripts\kata.cmd kata1 demo
scripts\kata.cmd kata2 dev
scripts\kata.cmd kata2 all
scripts\kata.cmd kata4 pipeline
scripts\kata.cmd kata4 tests
scripts\kata.cmd all validate
```

## O Que Ler Em Seguida

### Kata 1

Leia nesta ordem:

1. `kata-1/README.md`
2. `kata-1/ANALISE.md`
3. `kata-1/src/triage_queue/`
4. `kata-1/tests/test_triage.py`
5. `kata-1/schema.sql`

### Kata 2

Leia nesta ordem:

1. `kata-2/README.md`
2. `kata-2/REQUISITOS.md`
3. `kata-2/ENGENHARIA.md`
4. `kata-2/TESTES.md`
5. `kata-2/backend`, `kata-2/frontend` e `kata-2/backend.tests`

### Kata 3

Leia direto:

1. `kata-3/PLANO.md`

### Kata 4

Leia nesta ordem:

1. `kata-4/README.md`
2. `kata-4/ANALISE.md`
3. `kata-4/src/report_pipeline/`
4. `kata-4/tests/test_pipeline.py`

## Validacao Completa

Fluxo principal do repositorio:

```bash
bash scripts/kata.sh all validate
```

Windows nativo:

```text
scripts\kata.cmd all validate
```

Se a revisao for por partes, cada README local explica os comandos e o foco do seu proprio escopo.
