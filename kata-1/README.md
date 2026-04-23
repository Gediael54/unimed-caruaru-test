# Kata 1 - Fila de Triagem

## O que esta pasta entrega

- `src/triage_queue/domain.py`: implementacao real da ordenacao da fila e estrutura adicional para operacao continua;
- `src/triage_queue/verify_cli.py`: validacao executavel e benchmark;
- `src/triage_queue/explore_cli.py`: explorer interativo;
- `tests/test_triage.py`: testes unitarios e de integracao;
- `schema.sql`: modelagem SQL e view com a mesma logica de priorizacao;
- `verify.py`: wrapper de compatibilidade para manter os comandos documentados;
- `explore.py`: wrapper de compatibilidade para manter os comandos documentados;
- `triage.py`: wrapper de compatibilidade para import legado;
- `pyproject.toml`: metadados do mini projeto Python;
- `ANALISE.md`: decisoes de engenharia e trade-offs.

## Trade-off da organizacao

A implementacao saiu de uma pasta totalmente plana para um formato mais proximo de projeto real:

- `src/` concentra a regra de negocio;
- `tests/` deixa a suite explicita;
- wrappers na raiz preservam os comandos esperados pelo README, runner e showcase.

Escolhi esse meio-termo porque melhora a arquitetura sem quebrar o fluxo de avaliacao.

## Como validar

Fluxo principal:

```bash
python3 verify.py
```

Outras validacoes:

```bash
python3 verify.py --mode full-verbose
python3 verify.py --mode demo
python3 verify.py --mode benchmark
python3 explore.py
python3 explore.py --case rule-1
python3 explore.py --size 5000
python3 -m unittest discover -s . -p 'test_*.py'
```

## Checklist rapido

Atende:

- regras 1 a 5 do enunciado;
- testes de borda das regras etarias;
- justificativa de estrutura de dados;
- analise de escalabilidade;
- modelagem SQL com view equivalente;
- camada extra de exploracao guiada para demonstracao.

Limites conhecidos:

- a solucao principal e orientada a lote;
- persistencia nao faz parte da implementacao Python principal;
- o benchmark e ilustrativo, nao cientifico.
