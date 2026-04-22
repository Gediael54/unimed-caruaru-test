# Showcase do Repositorio

O `showcase/` e a camada visual de apoio da entrega. Ele organiza a revisao em
tres frentes, sem expor arquivos internos:

- `documentacao`: leitura passiva de markdown;
- `execucao real`: chamadas permitidas pela whitelist, com retorno real da API local;
- `exploracao/benchmark`: apoio visual para navegacao e para o benchmark da Kata 1.

Limites desta camada:

- nao substitui o runner `bash scripts/kata.sh`;
- nao substitui os comandos manuais por kata;
- nao substitui o frontend real da Kata 2;
- nao transforma markdown em execucao;
- nao executa fora do catalogo whitelist;
- nao expoe codigo-fonte nem arquivos internos de trabalho.

Em outras palavras: o terminal continua sendo a fonte de verdade da execucao, e
o showcase existe para melhorar a revisao do projeto.

No Windows, o ponto de atencao principal e o runner em `bash`, nao o
`showcase/`. A vitrine pode ser aberta nativamente por `cmd.exe` ou PowerShell
usando os atalhos `.cmd` abaixo.

## Como executar

Pelo runner:

```bash
bash scripts/kata.sh showcase serve
```

Manualmente:

```bash
python3 showcase/server.py
```

No Windows nativo:

```text
showcase\start.cmd
```

Depois, abra `http://localhost:8787`.

## Validacao

Pelo runner:

```bash
bash scripts/kata.sh showcase tests
```

Manualmente:

```bash
python3 -m unittest discover -s showcase -p 'test_*.py'
```

No Windows nativo:

```text
showcase\tests.cmd
```

## Decisao de arquitetura

O showcase foi mantido separado da Kata 2 para preservar a leitura correta do
escopo:

- a Kata 2 continua sendo o produto full-stack avaliado;
- o showcase permanece como infraestrutura de apresentacao do repositorio;
- o benchmark da Kata 1 continua existindo como exploracao dedicada, sem virar fonte de verdade da execucao.

### Por que o showcase nao virou um frontend em React

Escolhi **nao transformar o showcase em um segundo frontend React** por uma
decisao de escopo e de leitura da entrega.

Motivos principais:

- o frontend que precisa ser avaliado como produto da prova ja esta na `kata-2/frontend`;
- criar outro frontend React aqui adicionaria uma segunda aplicacao web concorrente dentro do mesmo repositorio;
- isso aumentaria o risco de o avaliador confundir o que e **produto da Kata 2** com o que e apenas **infraestrutura de apresentacao**;
- para o papel do showcase, HTML + CSS + JavaScript modular ja resolvem o necessario:
  - navegar pelas paginas;
  - abrir markdown;
  - disparar apenas comandos whitelist;
  - acompanhar retorno real da API local;
  - sustentar o benchmark visual da Kata 1;
- sem React, o showcase continua mais leve para subir e entender, sem exigir outro ciclo de build, outro `npm install` e outra arvore de dependencias so para uma camada auxiliar.

Trade-off assumido:

- React daria melhor ergonomia de componentizacao, testes de UI e composicao de estado;
- por outro lado, aqui isso aumentaria a complexidade operacional de uma camada
  que nao e o foco principal da avaliacao.

Em resumo: o `showcase/` foi mantido como **vitrine tecnica do repositorio**,
enquanto o frontend em React ficou concentrado onde o enunciado realmente pede
um produto web para ser avaliado: a **Kata 2**.
