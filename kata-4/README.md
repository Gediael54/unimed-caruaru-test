# Kata 4 - Pipeline De Indicadores

## Papel Deste README

Este README e o guia local da Kata 4. Ele cobre:

- o que existe nesta pasta;
- como rodar o pipeline;
- como validar os testes;
- em que ordem vale a pena ler a implementacao e a analise.

Se voce quer o mapa do repositorio inteiro, use `../README.md`.

## Ordem Recomendada De Leitura

1. este `README.md` para estrutura e comandos;
2. `ANALISE.md` para trade-offs, escala e criterio de tratamento de dados;
3. `src/report_pipeline/app.py` para a implementacao principal;
4. `tests/test_pipeline.py` para a cobertura automatizada;
5. `output/` para inspecionar os artefatos gerados.

## Estrutura Da Pasta

- `src/report_pipeline/app.py`
  - implementacao principal do pipeline;
- `tests/test_pipeline.py`
  - suite automatizada;
- `pipeline.py`
  - wrapper fino para preservar os comandos documentados;
- `pyproject.toml`
  - metadados do mini projeto Python;
- `data/`
  - CSVs de entrada;
- `output/`
  - artefatos gerados pelo pipeline;
- `ANALISE.md`
  - justificativas tecnicas e trade-offs.

## O Que Precisa Para Rodar

- `Python 3.11+`

Nao ha dependencias externas da kata para instalar via `pip`.

## Como Rodar

### Manual

Na raiz do repositorio:

```bash
python3 kata-4/pipeline.py
python3 kata-4/pipeline.py --quiet
python3 -m unittest discover -s kata-4 -p 'test_*.py'
```

### Runner

```bash
bash scripts/kata.sh kata4 pipeline
bash scripts/kata.sh kata4 tests
bash scripts/kata.sh kata4 all
```

### Windows Nativo

```text
scripts\kata.cmd kata4 pipeline
scripts\kata.cmd kata4 tests
scripts\kata.cmd kata4 all
```

## Artefatos Gerados

Ao rodar o pipeline, os principais arquivos de saida ficam em:

- `kata-4/output/consolidated.csv`
- `kata-4/output/indicators.json`

## O Que Vale Conferir

Se a revisao for rapida:

- rode o pipeline;
- confira os dois artefatos em `output/`;
- leia `ANALISE.md`.

Se a revisao for mais profunda:

- abra `src/report_pipeline/app.py`;
- confira os cenarios em `tests/test_pipeline.py`;
- compare a analise escrita com os casos cobertos na suite.
