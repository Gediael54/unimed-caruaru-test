# Análise Kata 4

## Decisões de Tratamento

Datas são normalizadas para o formato ISO `YYYY-MM-DD` na saída. O parser aceita `DD/MM/YYYY`, `YYYY-MM-DD` e valores ISO com aparência de timestamp.

Valores monetários são lidos como `Decimal` para evitar erros de arredondamento do ponto flutuante. Decimais com vírgula são aceitos e a saída é escrita com duas casas decimais.

Campos obrigatórios são validados antes do registro entrar no conjunto consolidado. Linhas inválidas são descartadas e reportadas em `indicators.json` dentro de `rejected_rows`.

Entregas sem pedido correspondente são tratadas como registros órfãos. Elas não geram pedidos consolidados, mas a contagem e os IDs são incluídos nos indicadores.

Nomes de cidade são aparados, normalizados sem acentos, com espaços colapsados e em title case antes do agrupamento. Por exemplo, `Maceió` vira `Maceio`.

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

Os testes cobrem parsing de datas, parsing de valores monetários, normalização de cidades, joins, cálculo de atraso, tratamento de entregas órfãs e saída de indicadores.
