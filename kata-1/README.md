# Kata 1 - Fila de Triagem

## Papel Deste README

Este README e o guia local da Kata 1. Ele cobre:

- o que existe nesta pasta;
- como executar e validar a kata;
- em que ordem vale a pena ler os arquivos;
- quais limites e trade-offs ficam para `ANALISE.md`.

Se voce quer o mapa do repositorio inteiro, volte para `../README.md`.

## Ordem Recomendada De Leitura

1. este `README.md` para ver estrutura e comandos;
2. `ANALISE.md` para entender decisoes de modelagem, SQL e benchmark;
3. `python3 verify.py --mode demo` ou `bash scripts/kata.sh kata1 demo`;
4. `src/triage_queue/domain.py` para a regra principal;
5. `tests/test_triage.py` para a cobertura automatizada;
6. `schema.sql` para a leitura SQL equivalente.

## Estrutura Da Pasta

- `src/triage_queue/domain.py`
  - implementacao principal da ordenacao e da estrutura de apoio;
- `src/triage_queue/verify_cli.py`
  - validacao executavel, benchmark e checklist de rastreabilidade;
- `src/triage_queue/explore_cli.py`
  - explorer interativo de casos e volume;
- `tests/test_triage.py`
  - testes unitarios e de integracao;
- `schema.sql`
  - modelagem SQL e view com a mesma logica de priorizacao;
- `verify.py`, `explore.py`, `triage.py`
  - wrappers finos para manter os comandos documentados;
- `pyproject.toml`
  - metadados do mini projeto Python;
- `ANALISE.md`
  - trade-offs, escalabilidade e justificativas.

## O Que Precisa Para Rodar

- `Python 3.11+`

Nao ha dependencias externas da kata para instalar via `pip`.

## Comandos Principais

### Manual

Dentro de `kata-1/`:

```bash
python3 verify.py
python3 verify.py --mode demo
python3 verify.py --mode full-verbose
python3 verify.py --mode benchmark
python3 explore.py
python3 -m unittest discover -s . -p 'test_*.py'
```

### Runner

Na raiz do repositorio:

```bash
bash scripts/kata.sh kata1 tests
bash scripts/kata.sh kata1 demo
bash scripts/kata.sh kata1 verify
bash scripts/kata.sh kata1 verify-verbose
bash scripts/kata.sh kata1 benchmark
bash scripts/kata.sh kata1 explore
```

### Windows Nativo

Na raiz do repositorio:

```text
scripts\kata.cmd kata1 tests
scripts\kata.cmd kata1 demo
scripts\kata.cmd kata1 verify
scripts\kata.cmd kata1 verify-verbose
scripts\kata.cmd kata1 benchmark
scripts\kata.cmd kata1 explore
```

## O Que Vale Conferir

Se a revisao for rapida:

- rode `demo` e `tests`;
- leia `ANALISE.md`;
- abra `domain.py`.

Se a revisao for mais profunda:

- compare `domain.py` com `schema.sql`;
- veja os casos de borda em `tests/test_triage.py`;
- rode `verify.py` para a validacao guiada;
- rode `explore.py` para inspecao manual de casos.

## Limites Conhecidos

- a solucao principal e orientada a lote;
- o benchmark e ilustrativo, nao cientifico;
- a persistencia SQL existe como modelagem e validacao de paridade, nao como app transacional completa.
