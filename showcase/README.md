# Showcase Do Repositorio

## Papel Deste README

Este README explica apenas a vitrine visual do projeto:

- o que o `showcase/` faz;
- o que ele nao faz;
- como subir e testar essa camada;
- como ele se encaixa na leitura do repositorio.

Se voce quer o mapa geral, use `../README.md`.

## Quando Usar O Showcase

Use o showcase quando quiser:

- comecar a revisao pelo mapa visual do projeto;
- abrir documentacao sem sair do navegador;
- executar apenas comandos permitidos pela whitelist da API local;
- navegar pelas katas e pelo playground visual da Kata 1.

Nao use o showcase como substituto:

- do runner oficial;
- dos comandos manuais por kata;
- do frontend real da Kata 2.

O terminal continua sendo a fonte de verdade da execucao.

## Ordem Recomendada De Leitura

1. `../README.md` para mapa, ambiente e comandos gerais;
2. este `showcase/README.md` para entender a vitrine;
3. os READMEs das katas quando a revisao entrar em cada escopo.

## O Que Precisa Para Rodar

- `Python 3.11+`

O showcase nao exige `npm install`, `pip install` ou outro frontend separado.

## Como Subir

### Linux, macOS, WSL ou Git Bash

```bash
bash scripts/kata.sh showcase serve
```

Ou manualmente:

```bash
python3 showcase/server.py
```

### Windows Nativo

```text
scripts\kata.cmd showcase serve
showcase\start.cmd
```

Os dois comandos acima passam pelos mesmos checks de Python e exibem a mesma mensagem de erro.

Depois, abra:

```text
http://localhost:8787
```

## Como Validar

### Linux, macOS, WSL ou Git Bash

```bash
bash scripts/kata.sh showcase tests
```

Ou manualmente:

```bash
python3 -m unittest discover -s showcase -p "test_*.py"
```

### Windows Nativo

```text
scripts\kata.cmd showcase tests
showcase\tests.cmd
```

Se o Python acabou de ser instalado no Windows e ainda nao apareceu no terminal, feche o `cmd.exe` ou PowerShell, abra outro e teste `py -3 --version` ou `python --version`.

## O Que Esta Pasta Faz

- serve HTML, CSS e JavaScript do portal;
- expoe uma API local para health, docs, execucao controlada e playground;
- limita a execucao ao catalogo de comandos permitido;
- mostra a saida real retornada pela API local do showcase.

## O Que Esta Pasta Nao Faz

- nao substitui o runner;
- nao substitui a Kata 2;
- nao executa qualquer comando arbitrario do sistema;
- nao vira um segundo frontend React do repositorio.

## Decisao De Arquitetura

O showcase foi mantido separado da Kata 2 por uma razao de leitura:

- a Kata 2 continua sendo o produto full-stack avaliado;
- o showcase continua sendo infraestrutura de apresentacao;
- isso evita misturar "portal de revisao" com "produto da prova".

Em resumo:

- `showcase/` organiza a revisao;
- `kata-2/frontend` continua sendo a interface do produto;
- `scripts/kata.sh` e `scripts\kata.cmd` continuam sendo os pontos oficiais de execucao.
