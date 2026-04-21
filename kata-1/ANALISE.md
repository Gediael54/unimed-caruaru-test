# Análise Kata 1

## Nota Sobre Idioma

Optei por escrever a análise em português porque o enunciado e a avaliação estão em português. O código permanece com identificadores em inglês, que é o padrão mais comum em projetos profissionais.

## Escopo, Premissas e Decisões

- A Parte A recebe um lote de pacientes já conhecido e devolve a fila ordenada.
- A fila respeita prioridade ajustada e FIFO.
- Em empate exato de prioridade e horário, a ordem original de entrada é preservada.
- As regras etárias são independentes:
  - idoso: `idade >= 60`
  - menor: `idade < 18`
- O domínio canônico usa os termos do enunciado: `BAIXA`, `MÉDIA`, `ALTA`, `CRÍTICA`.
- O parser aceita equivalentes em inglês e sem acento (`LOW`, `MEDIUM`, `CRITICAL`, `MEDIA`, `CRITICA`) por robustez.
- `arrival_time` aceita `datetime`, ISO 8601 e `HH:MM`.
- Timestamps com timezone explícito são rejeitados para não misturar horário local da clínica com valores em offset diferente.
- Entrada inválida não é corrigida silenciosamente: gera `ValueError`.

Essas decisões aparecem nos testes para não ficarem implícitas.

## Decisão de Engenharia: Escolha da Stack

Mantive o Kata 1 em Python por ser a opção mais direta para algoritmo, ordenação e testes.

### Por que Python aqui

- Menos cerimônia para um problema dominado por regra de negócio.
- Leitura rápida da função principal, dos testes e da análise.
- Melhor relação entre clareza e volume de código neste escopo.

### Por que não .NET neste kata

- Funcionaria, mas aumentaria estrutura incidental para um problema pequeno.
- O repositório já demonstra .NET com profundidade na Kata 2.
- Para este kata, mais estrutura não aumentaria a qualidade do raciocínio na mesma proporção.

Trade-off: .NET deixaria a solução mais “corporativa”, mas menos enxuta para uma tarefa cujo foco principal é a lógica de triagem.

## Arquitetura de Pastas e Responsabilidades

O `kata-1` foi mantido propositalmente plano:

- `triage.py`: regra de domínio e estruturas de dados
- `test_triage.py`: testes unitários e de integração
- `schema.sql`: modelagem SQL e consulta equivalente
- `verify.py`: validação executável
- `ANALISE.md`: decisões e trade-offs

Além disso, o repositório expõe um runner em `scripts/kata.sh`. Para a Kata 1, as entradas principais são:

- `bash scripts/kata.sh kata1 verify`
- `bash scripts/kata.sh kata1 verify-verbose`
- `bash scripts/kata.sh kata1 demo`
- `bash scripts/kata.sh kata1 benchmark`

### Por que manter a pasta plana

- O kata é pequeno e tem um único módulo central.
- Quebrar em muitas camadas aumentaria navegação sem ganho real.
- Para o avaliador, abrir poucos arquivos e entender tudo rápido é melhor.

### Por que não dividir o Python em vários módulos

Considerei separar parsing, priorização e fila contínua. Não fiz isso porque:

- o volume atual ainda cabe confortavelmente em um arquivo;
- a coesão é alta;
- a divisão aumentaria estrutura antes de haver necessidade real.

Se o escopo crescesse, a separação natural seria em `parsing.py`, `priority_rules.py`, `queueing.py` e `models.py`.

## Nomenclatura

- Arquivos e símbolos em inglês
- Valores de domínio canônicos em português
- Testes com nomes descritivos e orientados a comportamento

### Por que código em inglês

- É o padrão mais comum em bases profissionais.
- Evita misturar linguagem natural com linguagem técnica.
- Facilita evolução futura.

### Por que urgência canônica em português

- É exatamente o contrato do enunciado.
- Reduz interpretação ambígua.
- Mantém alinhamento direto com o problema.

Trade-off: padronizar tudo em inglês deixaria o código mais homogêneo, mas enfraqueceria o alinhamento com o requisito.

## Política de Comentários e Documentação no Código

Evitei comentários inline para narrar o óbvio. Preferi:

- docstrings nas partes principais;
- nomes explícitos;
- explicação estratégica neste documento.

### Por que evitar comentários no meio do Python

- Comentário redundante envelhece rápido.
- Em código pequeno, vira ruído visual.
- Quando o nome da função e a expressão já comunicam a regra, o comentário só repete informação.

Exemplo evitado:

- `# incrementa prioridade do menor`

Em `priority = min(priority + 1, MAX_PRIORITY)`, a regra já está clara.

### Onde comentários foram mantidos

No `schema.sql`, há mais comentários porque o arquivo é também artefato de avaliação de modelagem, índices e auditoria.

## Constantes de Domínio, Dados de Demonstração e Configuração

Nem todo literal é um problema. O importante é separar:

- contrato de domínio;
- dado determinístico de demonstração;
- detalhe operacional de execução.

### Constantes de domínio

No `triage.py`, os limiares etários e a promoção de prioridade foram nomeados:

- `ELDERLY_AGE_THRESHOLD = 60`
- `MINOR_AGE_THRESHOLD = 18`
- `ELDERLY_PROMOTION_SOURCE_PRIORITY`
- `ELDERLY_PROMOTION_TARGET_PRIORITY`

Isso melhora rastreabilidade sem transformar qualquer valor em constante.

### Dados de demonstração e benchmark

No `verify.py`, datas, horários e escalas do benchmark foram centralizados como dados fixos de demonstração.

Trade-off:

- parametrizar tudo daria mais flexibilidade;
- manter o cenário fixo dá repetibilidade e facilita comparação.

Aqui, repetibilidade foi mais importante.

### Configuração de execução

Também ficaram separados como configuração:

- modo padrão do `verify.py`
- largura do relatório
- total de seções
- comando principal do CI

## Estrutura de Dados

### Escolha Principal da Parte A

A solução principal usa uma lista ordenada em batch:

1. normaliza urgência
2. normaliza horário
3. calcula prioridade ajustada
4. ordena por prioridade desc, horário asc e posição original asc

### Por que essa escolha

- É exatamente o que o enunciado pede: recebe uma lista e devolve a fila ordenada.
- Como toda a entrada já está disponível, ordenar uma vez é simples e correto.
- O desempate final pela posição original preserva FIFO de forma explícita.

### Complexidade

- Solução principal: `O(n log n)`
- Para uma clínica comum: totalmente aceitável

## Interação Entre Regras 4 e 5

As regras não competem entre si; elas se aplicam a faixas etárias diferentes.

- Regra 4: `idade >= 60` e urgência `MÉDIA` -> sobe para `ALTA`
- Regra 5: `idade < 18` -> sobe um nível, com teto em `CRÍTICA`

Caso pedido no enunciado:

- paciente de `15` anos com urgência `MÉDIA` -> vira `ALTA` pela regra do menor

Casos importantes:

- `65 anos + MÉDIA` -> `ALTA`
- `10 anos + BAIXA` -> `MÉDIA`
- `10 anos + ALTA` -> `CRÍTICA`
- `10 anos + CRÍTICA` -> continua `CRÍTICA`

## Exemplos Concretos de Comportamento

No `verify.py --mode demo`, a demonstração foi separada por cenário auditável:

- Regra 1 com paciente crítico chegando depois
- Regra 2 sem paciente crítico
- Regra 3 com FIFO por horário
- Regra 3 com empate exato
- Regra 4 com borda `59/60`
- Regra 5 com borda `17/18` e promoção em todos os níveis
- lote combinado com comparação Python × SQL
- parsing flexível (`PT/EN`, acento, `HH:MM`, ISO)

Trade-off: um exemplo único grande é bom para mostrar o sistema funcionando, mas cenários separados são melhores para provar que cada regra funciona por si só.

## Análise de Escalabilidade

### O que muda com 1 milhão de pacientes

Com `1 milhão` de pacientes, a solução em lote ainda é viável em termos algorítmicos, mas deixa de ser a melhor escolha se a fila estiver mudando continuamente.

O principal risco não é um único sort grande; é reordenar a fila inteira repetidas vezes ao longo do dia.

### Alternativas consideradas

#### 1. Sort em batch

- Custo: `O(n log n)`
- Melhor para: lote fechado

#### 2. Heap / fila de prioridade

- Inserção: `O(log n)`
- Extração: `O(log n)`
- Melhor para: fluxo contínuo
- Trade-off: leitura menos direta do que uma lista final ordenada

#### 3. Bucket queue com quatro deques FIFO

- Inserção: `O(1)`
- Extração: `O(1)`
- Snapshot: `O(n)`
- Melhor para: operação contínua neste domínio, porque existem apenas quatro prioridades

Por isso implementei `TriageBucketQueue` como alternativa adicional para o cenário operacional real.

Ela também falha explicitamente se o `enqueue` tentar inserir, dentro do mesmo bucket de prioridade ajustada, um paciente com horário anterior ao último já enfileirado. Isso evita mascarar uma fila incorreta quando a pré-condição operacional de chegada ordenada é violada.

#### 4. Banco com índice e ordenação SQL

- Melhor para: persistência, concorrência, auditoria e relatórios
- Trade-off: maior custo de infraestrutura e complexidade transacional

### Quando a solução atual deixa de ser a melhor

O sinal de troca aparece quando:

- pacientes chegam continuamente;
- a fila é recalculada a cada nova entrada;
- existe concorrência operacional;
- é necessário histórico persistente e auditoria.

Nesse ponto, o projeto já aponta caminhos melhores:

- `TriageBucketQueue`
- `schema.sql`
- `v_triage_queue_ordered`

O `verify.py` mostra isso por benchmark ilustrativo com ordens de grandeza (`10³` a `10⁷`).

## Decisões de Modelagem SQL

### Por que modelar mais do que o mínimo

A Parte C era opcional e podia ser mínima. Mesmo assim, modelei mais porque banco é um dos critérios gerais de avaliação.

O schema cobre:

- catálogo de urgências
- pacientes
- filas de triagem
- entradas na fila
- profissionais
- atendimentos
- índices
- view ordenada

### Trade-offs principais do schema

#### `age` e `birthdate`

- `age` simplifica a leitura do enunciado
- `birthdate` é mais correto para produção

Mantive ambos para mostrar a evolução do modelo.

#### `urgency_code` e `adjusted_urgency_code`

- guardar só a urgência final simplificaria
- guardar também a declarada melhora auditoria

#### `sequence_number`

Foi adicionado para garantir desempate determinístico igual ao Python.

- `arrived_at` sozinho não resolve empate exato
- `entry_id` seria determinístico, mas não preservaria a ordem real de entrada

#### VIEW recalculando a urgência

- confiar só no valor persistido seria mais barato
- recalcular aumenta segurança e auditabilidade

## Testes e Evidência de Qualidade

A suíte cobre:

- urgência em português e inglês
- acento, caixa e entradas inválidas
- horários em `datetime`, ISO e `HH:MM`
- regras 4 e 5 com bordas `17`, `18`, `59`, `60`
- empates exatos
- equivalência Python × SQL
- constraints do schema
- fila contínua com `TriageBucketQueue`

Além dos testes, o `verify.py` produz evidência executável:

1. executa testes
2. mede cobertura de `triage.py`
3. valida o schema
4. mostra a demonstração
5. rastreia requisitos do enunciado

Com isso, a entrega não depende só de leitura manual.

## Modos de Execução da Demonstração

### Validação completa resumida

- `python3 kata-1/verify.py`
- `bash scripts/kata.sh kata1 verify`

Usa demonstração resumida para facilitar leitura rápida.

### Validação completa detalhada

- `python3 kata-1/verify.py --mode full-verbose`
- `bash scripts/kata.sh kata1 verify-verbose`

Mantém o fluxo completo com a demonstração detalhada.

### Apenas demonstração detalhada

- `python3 kata-1/verify.py --mode demo`
- `bash scripts/kata.sh kata1 demo`

Serve para auditoria caso a caso.

### Apenas benchmark ilustrativo

- `python3 kata-1/verify.py --mode benchmark`
- `bash scripts/kata.sh kata1 benchmark`

Serve para demonstrar tendência de custo, não como teste rígido de performance.

Trade-off geral: separar resumo e detalhamento melhora legibilidade sem perder profundidade.

## Trade-off da Interface do Runner

O `scripts/kata.sh` foi simplificado de propósito.

- menos ruído visual
- navegação mais previsível
- foco nos comandos importantes

Trade-off: uma interface mais ornamentada poderia parecer mais bonita, mas também mais cansativa e menos objetiva durante a avaliação.

## Trade-off da Automação em CI

Adicionei `.github/workflows/kata-1.yml` para rodar:

- `bash scripts/kata.sh kata1 verify`

Motivos:

- mesmo comando local e no CI
- menos divergência entre revisão manual e pipeline
- escopo focado na `kata-1`

Trade-off: um CI mais amplo cobriria mais coisas, mas esse workflow específico é mais estável e mais coerente com o objetivo imediato do kata.

## Tratamento de Erros e Validação

A estratégia foi falhar cedo e de forma explícita:

- urgência inválida -> `ValueError`
- idade não inteira -> `ValueError`
- idade negativa -> `ValueError`
- horário inválido -> `ValueError`
- timestamp com timezone -> `ValueError`
- constraints importantes reforçadas no SQL

### Por que preferi erro explícito

- aumenta previsibilidade
- evita mascarar erro de entrada
- é mais auditável do que normalização permissiva

## Por que não adicionei logs estruturados no Kata 1

Não adicionei logs estruturados por uma razão de escopo.

O `kata-1` é:

- lógica de domínio pura
- testes
- script de validação
- modelagem SQL demonstrativa

Nesse contexto, a observabilidade principal é:

- exceção explícita
- teste cobrindo casos válidos e inválidos
- `verify.py`
- CI

Trade-off:

- logs em função pura poderiam simular preocupação com produção;
- mas aqui adicionariam ruído e acoplamento sem ganho proporcional.

Se essa lógica estivesse em uma API ou worker de produção, aí sim eu esperaria logs estruturados, correlação, métricas e tratamento padronizado na borda.

## Extensibilidade

O principal ponto de extensão é `calculate_adjusted_priority`.

Hoje a função é pequena e direta, então manter a regra inline ainda é a melhor escolha. Se o sistema crescer, a evolução natural seria migrar para regras explícitas, por exemplo:

- gestante
- comorbidade
- retorno prioritário
- prioridade por tempo máximo de espera

Isso manteria a ordenação desacoplada da política clínica.

Em resumo:

- a função em lote atende a Parte A
- `TriageBucketQueue` cobre operação contínua
- o SQL cobre persistência e relatórios
- a VIEW cobre paridade entre regra de aplicação e regra de banco

A solução não foi desenhada como overengineering, mas também não ficou presa a um único formato de execução.
