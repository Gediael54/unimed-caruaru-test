# Análise Kata 1

## Estratégia da Fila

Uma lista ordenada é suficiente para este problema em lote, porque todos os pacientes já são conhecidos antes da ordenação. O algoritmo calcula a prioridade ajustada uma vez por paciente e depois ordena por:

1. prioridade ajustada em ordem decrescente;
2. horário de chegada em ordem crescente;
3. posição original na entrada como critério final de desempate.

Esse desempate final preserva o comportamento FIFO para registros com mesma urgência ajustada e mesmo horário de chegada.

## Complexidade

A implementação custa `O(n log n)`, pois a ordenação domina o trabalho. Para um lote pequeno ou médio de triagem, isso é simples e confiável.

Para 1 milhão de pacientes vale considerar alternativas:

- Uma fila de prioridade, se os pacientes chegam continuamente e o próximo paciente precisa ser escolhido de forma incremental.
- Baldes por nível de prioridade, já que existem apenas quatro níveis de urgência. Cada balde pode preservar FIFO e reduzir o custo de ordenação.
- Ordenação no banco de dados, caso os registros já estejam em um armazenamento transacional e haja necessidade de paginação.

## Interação Entre Regras

A regra dos idosos apenas promove a urgência `MEDIUM` para `HIGH` em pacientes com 60 anos ou mais. A regra dos menores se aplica separadamente a pacientes com menos de 18 anos e sobe a prioridade atual em um nível, limitada a `CRITICAL`.

Um paciente de 15 anos com urgência `MEDIUM` se torna `HIGH` por causa da regra de menor. A regra de idoso não se aplica, porque o paciente não tem ao menos 60 anos.

## Extensibilidade

O ajuste de prioridade está isolado em `calculate_adjusted_priority`. Novas regras podem ser adicionadas ali ou migradas para uma lista de funções de regra, caso o número cresça. Manter o ajuste separado da ordenação evita misturar decisões de negócio com mecânica da fila.
