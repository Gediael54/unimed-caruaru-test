# Kata 1 - Fila de Triagem

## O que esta pasta entrega

- `triage.py`: implementacao da ordenacao da fila e estrutura adicional para operacao continua;
- `test_triage.py`: testes unitarios e de integracao;
- `schema.sql`: modelagem SQL e view com a mesma logica de priorizacao;
- `verify.py`: validacao executavel com rastreabilidade do enunciado;
- `explore.py`: explorer interativo para rodar casos isolados e simular volume;
- `ANALISE.md`: decisoes de engenharia e trade-offs.

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
