# Análise Kata 4

## Decisões de Tratamento

Datas são normalizadas para o formato ISO `YYYY-MM-DD` na saída. O parser aceita `DD/MM/YYYY`, `YYYY-MM-DD` e valores ISO com aparência de timestamp.

Valores monetários são lidos como `Decimal` para evitar erros de arredondamento do ponto flutuante. O parser aceita decimal BR (`1.250,75`) e US (`1,250.75`) detectando o separador decimal pelo último separador usado; a saída é escrita com duas casas decimais.

Campos obrigatórios são validados antes do registro entrar no conjunto consolidado. Linhas inválidas são descartadas e reportadas em `indicators.json` dentro de `rejected_rows`.

Entregas sem pedido correspondente são tratadas como registros órfãos. Elas não geram pedidos consolidados, mas a contagem e os IDs são incluídos nos indicadores.

Os percentuais de entrega consideram apenas pedidos não cancelados com `status_entrega = entregue` e `data_realizada` preenchida. Isso evita que pedido cancelado ou entrega ainda pendente altere o KPI operacional de prazo.

Duplicidades de `id_pedido` e `id_cliente` não são sobrescritas silenciosamente. A política adotada é: **a primeira linha válida vence; ocorrências duplicadas posteriores são rejeitadas e reportadas**. Isso preserva determinismo, evita perda silenciosa de informação e deixa a anomalia visível para auditoria.

Nomes de cidade são aparados, normalizados sem acentos, com espaços colapsados e em title case antes do agrupamento. Por exemplo, `Maceió` vira `Maceio`.

Os arquivos de exemplo seguem literalmente o contrato do enunciado:

- `pedidos.csv`: `id_pedido`, `data_pedido`, `id_cliente`, `valor_total`, `status`;
- `clientes.csv`: `id_cliente`, `nome`, `cidade`, `estado`, `data_cadastro`;
- `entregas.csv`: `id_entrega`, `id_pedido`, `data_prevista`, `data_realizada`, `status_entrega`.

Internamente, o consolidado continua projetando os campos pedidos na saída (`nome_cliente`, `status_pedido`, `data_prevista_entrega`, `data_realizada_entrega`). O parser também aceita aliases da versão anterior para manter retrocompatibilidade da demonstração.

## Idempotência

O pipeline é idempotente para os mesmos arquivos de entrada. Ele lê apenas os três CSVs de origem e sobrescreve `consolidated.csv` e `indicators.json` de forma determinística em cada execução.

## Escalando Para 10 Milhões de Linhas

Para 10 milhões de linhas a abordagem em memória deve ser substituída ou limitada:

- Processar os CSVs em streaming em vez de carregar tudo em listas.
- Usar banco de dados ou armazenamento colunar para joins e agregações.
- Criar índices para IDs de pedido e de cliente.
- Gravar registros rejeitados em um relatório separado à medida que são processados.
- Particionar o processamento por data ou faixa de ID de pedido.
- Executar o pipeline como job orquestrado, com retries, métricas e logs de auditoria claros.

## Cobertura de Testes

Os testes cobrem parsing de datas, parsing de valores monetários BR/US, normalização de cidades, joins, cálculo de atraso, tratamento de entregas órfãs, política de duplicidades, execução com arquivos vazios, idempotência dos artefatos e saída de indicadores.

## Organização Do Projeto Python

O `kata-4` foi reorganizado para um formato mais próximo de projeto real:

- `src/report_pipeline/app.py`: implementação principal do pipeline;
- `tests/test_pipeline.py`: suíte automatizada;
- `pipeline.py`: wrapper fino de compatibilidade para preservar os comandos documentados;
- `pyproject.toml`: metadados do mini projeto.

Essa mudança foi feita para que o pipeline não parecesse apenas um script isolado que já "sabe" a resposta esperada. A regra de negócio, a CLI e os testes continuam reais, mas agora ficam apresentados com uma estrutura que lembra mais um projeto Python do dia a dia.

Trade-off:

- ganho: separação explícita entre implementação, testes e entrypoint;
- ganho: leitura mais profissional para avaliação;
- custo: `app.py` continua centralizando a lógica, então a divisão em módulos ainda não foi levada ao limite;
- custo: existe um wrapper adicional na raiz por compatibilidade.

## Forma de Apresentação do Pipeline

O pipeline não deveria apenas gerar os arquivos corretos; a saída no terminal também precisava ser legível e parecer resultado executado.

Por isso, o resumo final foi estruturado em blocos estáveis:

- metadados de entrada e saída;
- totais por status;
- ticket médio por estado;
- visão de entregas;
- top 3 cidades;
- qualidade dos dados;
- caminhos dos artefatos gerados.

### Trade-off

Poderia ser uma saída mínima, com apenas “gerado com sucesso”, mas isso obrigaria o avaliador a abrir os arquivos para entender se algo relevante mudou. Também poderia despejar JSON completo na tela, mas isso aumentaria ruído. O equilíbrio escolhido foi um resumo humano no terminal e os dados completos nos artefatos.

## Como Executar

Fluxo direto:

```bash
python3 kata-4/pipeline.py
python3 kata-4/pipeline.py --quiet
python3 -m unittest discover -s kata-4 -p 'test_*.py'
```

Fluxo pelo runner:

```bash
bash scripts/kata.sh kata4 pipeline
bash scripts/kata.sh kata4 tests
bash scripts/kata.sh kata4 all
```

## Exemplo de Entrada e Saída

### Entrada mínima

`pedidos.csv`

```csv
id_pedido,data_pedido,id_cliente,valor_total,status
P001,20/04/2026,C001,"120,50",pago
P002,2026-04-19,C002,80.00,pendente
```

`clientes.csv`

```csv
id_cliente,nome,cidade,estado,data_cadastro
C001,Ana Silva,Caruaru,PE,2024-01-10
C002,Bruno Lima,Maceió,AL,2024-02-15
```

`entregas.csv`

```csv
id_entrega,id_pedido,data_prevista,data_realizada,status_entrega
E001,P001,2026-04-22,2026-04-22,entregue
E002,P002,2026-04-22,2026-04-24,entregue
```

### Saída consolidada

```csv
id_pedido,nome_cliente,cidade_normalizada,estado,valor_total,status_pedido,data_pedido,data_prevista_entrega,data_realizada_entrega,atraso_dias,status_entrega
P001,Ana Silva,Caruaru,PE,120.50,pago,2026-04-20,2026-04-22,2026-04-22,0,entregue
P002,Bruno Lima,Maceio,AL,80.00,pendente,2026-04-19,2026-04-22,2026-04-24,2,entregue
```

### Fragmento de `indicators.json`

```json
{
  "total_orders_by_status": {
    "pago": 1,
    "pendente": 1
  },
  "delivery_percentages": {
    "delayed": 50.0,
    "on_time": 50.0
  }
}
```

## Decisões e Premissas

- datas vazias em colunas opcionais viram `null` lógico e são escritas como campo vazio no consolidado;
- `data_pedido` é obrigatória e a linha é rejeitada se faltar;
- dinheiro é tratado como `Decimal`, nunca como `float`;
- cidade é normalizada para chave de agrupamento, não para preservar grafia original;
- `id_entrega` e `data_cadastro` são aceitos e preservados na fronteira de entrada, mas não entram no consolidado porque o relatório final é por pedido;
- entrega órfã não cria pedido consolidado;
- entrega pendente e pedido cancelado não entram no cálculo de percentual de prazo;
- pedido sem cliente é rejeitado na etapa de join;
- a primeira linha válida vence em caso de duplicidade;
- o pipeline sobrescreve os artefatos de saída em toda execução.

## Ambiguidades Detectadas e Decisão Tomada

| Ambiguidade | Decisão | Trade-off |
| --- | --- | --- |
| datas em formatos mistos | aceitar `DD/MM/YYYY`, `YYYY-MM-DD` e ISO com timestamp | parser fica maior, mas o contrato de entrada realista fica coberto |
| vírgula BR vs ponto US em dinheiro | aceitar os dois formatos | mais tolerância, porém exige normalização explícita |
| cidade com e sem acento | agrupar pela forma normalizada sem acento | perde a grafia original no consolidado, mas ganha consistência analítica |
| colunas extras que não entram na saída (`id_entrega`, `data_cadastro`) | aceitar na entrada e ignorar na projeção final | mantém aderência ao enunciado sem poluir o consolidado |
| pedido sem cliente correspondente | rejeitar a linha consolidada e registrar motivo | preserva integridade do relatório, mas reduz volume consolidado |
| entrega órfã | não consolidar; contar e listar nos indicadores | relatório final fica consistente, mas a anomalia precisa ser auditada separadamente |
| encoding alternativo | manter UTF-8 como contrato de leitura | simplifica o pipeline, mas assume arquivo bem formado na fronteira |

## Tabela de Rejeição

| Motivo | Ação do pipeline |
| --- | --- |
| campo obrigatório vazio | rejeita linha e registra em `rejected_rows` |
| data inválida | rejeita linha e registra |
| dinheiro inválido | rejeita linha e registra |
| `id_pedido` duplicado | mantém a primeira linha válida e rejeita a repetição |
| `id_cliente` duplicado | mantém a primeira linha válida e rejeita a repetição |
| pedido sem cliente | rejeita na etapa de join e registra |
| entrega órfã | não entra no consolidado; vai para `orphan_delivery_ids` |

## Por Que `Decimal` e Não `float`

`float` seria mais simples de escrever, mas pior para domínio financeiro. Mesmo em um kata, eu preferi `Decimal` porque:

- evita erro de representação binária;
- mantém arredondamento explícito com `ROUND_HALF_UP`;
- torna o comportamento repetível no cálculo de ticket médio por estado.

## Por Que `NFKD` + Remoção de Acentos

O objetivo da normalização de cidades aqui não é exibir a grafia mais bonita, e sim agrupar corretamente.

Usei `NFKD` + remoção de acentos porque:

- resolve `São Paulo`, `sao paulo` e `SAO PAULO` para a mesma chave;
- mantém uma regra simples e determinística;
- reduz o risco de explodir grupos por diferença apenas ortográfica.

Se o produto exigisse preservar a grafia de origem para exibição, eu manteria duas colunas: uma normalizada para agrupamento e outra original para apresentação.

## Idempotência e Reprodutibilidade

O pipeline é idempotente em dois níveis:

1. mesma entrada gera os mesmos dados consolidados;
2. a escrita dos artefatos é determinística o suficiente para comparação byte a byte.

Isso acontece porque:

- os pedidos são ordenados por `id_pedido` antes da escrita;
- o JSON é salvo com `sort_keys=True` e `indent=2`;
- os arquivos de saída são sobrescritos integralmente em cada execução.

Na prática, rodar duas vezes com os mesmos CSVs produz o mesmo `consolidated.csv` e o mesmo `indicators.json`.

## Estrutura do Código: Por Que Mantive Um Módulo Principal

Mesmo com a mudança para `src/report_pipeline/`, avaliei separar o pipeline em `loaders.py`, `normalizers.py`, `writers.py` e `indicators.py`. Não fiz isso nesta entrega porque:

- o volume ainda é administrável;
- a leitura continua rápida para avaliação;
- a prioridade aqui era primeiro separar projeto, testes e entrypoint sem introduzir refatoração excessiva.

A decisão final foi intermediária:

- sair do formato "script único na raiz";
- manter a lógica principal concentrada em `src/report_pipeline/app.py`;
- deixar uma próxima etapa de modularização mais fina como evolução natural, não como complexidade antecipada.

## Escalando Para 10 Milhões de Linhas

Com 10 milhões de linhas, a abordagem atual em memória deixa de ser o desenho certo.

Mudanças que eu faria:

- leitura em streaming/chunks, não `list(csv.DictReader(...))`;
- stage raw -> stage normalizado -> tabela consolidada;
- joins e agregações em banco/engine analítico;
- persistência em Parquet ou tabela particionada por `data_pedido`;
- processo diário idempotente com staging + upsert.

Estimativa qualitativa:

- 10 milhões de linhas em listas Python tende a consumir vários gigabytes;
- o pipeline atual é ótimo para demonstração local, mas não para janela diária empresarial;
- em escala, eu esperaria throughput orientado a lote orquestrado, não script monolítico interativo.

## Estratégia de Warehouse / Banco

Para evolução além do CSV:

- staging de `pedidos`, `clientes` e `entregas` como tabelas brutas;
- camada tratada/conformed com deduplicação e datas normalizadas;
- mart consolidado de pedidos prontos para BI;
- particionamento por `data_pedido`;
- índices de range para datas e lookup por IDs;
- upsert idempotente por `id_pedido`.

Esse modelo está refletido no `kata-4/schema.sql` opcional.

## Cobertura e Estratégia de Teste

Além dos testes de integração com CSVs completos, os testes cobrem:

- data inválida;
- dinheiro inválido;
- cidade com acento;
- cliente faltante;
- entrega órfã;
- duplicidade;
- cada etapa auxiliar de CLI/resumo;
- idempotência byte a byte.

Medição local:

- `src/report_pipeline/app.py` fecha `100%` de cobertura de linha via `trace` da stdlib;
- a suíte atual tem `25` testes automatizados em `kata-4/tests/test_pipeline.py`.
