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

O `kata-1` foi reorganizado para um formato mais próximo de projeto Python real:

- `src/triage_queue/domain.py`: regra de domínio, parsing e estruturas de dados;
- `src/triage_queue/verify_cli.py`: validação executável, cobertura, benchmark e rastreabilidade;
- `src/triage_queue/explore_cli.py`: exploração guiada e simulação de volume;
- `tests/test_triage.py`: testes unitários e de integração;
- `schema.sql`: modelagem SQL e consulta equivalente;
- `triage.py`, `verify.py`, `explore.py`: wrappers finos de compatibilidade;
- `pyproject.toml`: metadados do mini projeto.

Além disso, o repositório expõe um runner em `scripts/kata.sh`. Para a Kata 1, as entradas principais são:

- `bash scripts/kata.sh kata1 verify`
- `bash scripts/kata.sh kata1 verify-verbose`
- `bash scripts/kata.sh kata1 demo`
- `bash scripts/kata.sh kata1 benchmark`

### Por que mover para `src/` e `tests/`

- Resolve a aparência de "scripts soltos" na raiz.
- Deixa explícito onde está a implementação real e onde está a suíte.
- Aproxima a entrega de um projeto pequeno, mas profissional.

### Por que manter wrappers finos na raiz

- O runner, o showcase e a documentação já apontavam para `verify.py`, `explore.py` e `triage.py`.
- Quebrar esses entrypoints só para forçar a nova arquitetura aumentaria atrito de avaliação.
- O wrapper deixa claro que existe uma fronteira entre compatibilidade de execução e implementação real.

Trade-off:

- ganho: arquitetura mais profissional e auditável;
- ganho: separação mais clara entre domínio, testes e entrypoints;
- custo: alguns arquivos extras;
- custo: passa a existir uma camada de compatibilidade na raiz do kata.

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

No módulo `src/triage_queue/domain.py`, os limiares etários e a promoção de prioridade foram nomeados:

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

## Forma de Apresentação da Saída Executável

Além de estar correta, a demonstração precisava parecer **execução real** e não texto explicativo corrido. Por isso a saída foi reorganizada em blocos previsíveis por caso:

- cabeçalho do caso;
- tabela do cenário de entrada;
- tabela da fila calculada ou da validação de ajustes;
- conferência entre esperado e obtido;
- status final do caso.

### Por que isso foi importante

- facilita leitura em terminal;
- reduz sensação de “documentação despejada” no meio da execução;
- deixa mais claro o que veio da entrada e o que foi calculado pelo algoritmo;
- aproxima a experiência do que um avaliador espera ao rodar um artefato técnico.

### Trade-off escolhido

Eu poderia deixar a saída extremamente curta, quase só com `OK/FAIL`, mas isso esconderia evidência demais. Também poderia deixar tudo explicadinho em prosa, mas a execução perderia ritmo. O meio-termo escolhido foi:

- modo resumido no fluxo completo;
- modo detalhado em `--mode demo`, com estrutura visual mais operacional.

## Modo Exploratório Adicional

Além do `verify.py`, adicionei um explorer separado em `explore.py` e uma camada visual na vitrine web para a Kata 1.

### Por que isso entrou

- alguns avaliadores preferem rodar tudo rapidamente e seguir adiante;
- outros querem cutucar cenários específicos, bordas e percepção de escala;
- deixar essa exploração fora do fluxo principal evita que a validação normal vire um labirinto de prompts.

### O que o explorer permite

- rodar todos os casos de negócio em sequência;
- escolher um caso isolado por chave;
- simular volumes customizados para comparar `batch sort`, `bucket queue` e o cenário contínuo ingênuo.
- explorar isso também pela vitrine web, com contador, progresso visual e mudança de estratégia conforme o volume.

### Trade-off escolhido

Transformar a validação principal inteira em um assistente interativo seria pior:

- aumentaria atrito para o avaliador que só quer confirmar a entrega;
- dificultaria automação e repetibilidade;
- passaria mais sensação de “demo guiada” do que de artefato técnico estável.

Por isso, a escolha foi manter:

- `verify.py` como caminho principal, determinístico e auditável;
- `explore.py` e a vitrine web como camada opcional de exploração.

### Orçamento de tempo na vitrine web

No começo, a vitrine era apenas uma camada estática de apresentação. Isso mudou quando a simulação de volume passou a pedir uma experiência mais fluida em cargas maiores.

A solução adotada foi híbrida:

- até `2.000` pacientes, a execução acontece no navegador;
- acima de `2.000`, o frontend delega a medição para uma API local própria do showcase;
- a interface acompanha o job com polling, mostrando estágio atual, quantidade processada e progresso;
- se o usuário mexer no slider de novo, a execução anterior é descartada e o contador reinicia.

Trade-off:

- deixar tudo sempre no navegador seria mais “puro”, mas pioraria muito a experiência;
- empurrar tudo sempre para backend esconderia a fronteira entre o que o browser suporta bem e o que já merece processamento dedicado;
- manter a vitrine puramente estática seria operacionalmente mais simples, mas limitaria a sensação de execução real.

O meio-termo escolhido foi transformar o showcase em UI + API local de apoio, mas apenas para esse fluxo exploratório. A validação principal continua no terminal, previsível e automatizável.

Para não virar um extra “bonito porém frágil”, a API local do showcase ganhou suíte dedicada em `showcase/test_server.py`. Ela cobre criação de jobs, cancelamento, progresso, endpoints HTTP e bootstrap do servidor, fechando `100%` de cobertura em `showcase/server.py`.

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
2. mede cobertura de `src/triage_queue/domain.py`
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

## Como Executar

Fluxo direto:

```bash
python3 -m unittest discover -s kata-1 -p 'test_*.py'
python3 kata-1/verify.py
python3 kata-1/verify.py --mode demo
python3 kata-1/explore.py --list-cases
```

Fluxo pelo runner:

```bash
bash scripts/kata.sh kata1 tests
bash scripts/kata.sh kata1 verify
bash scripts/kata.sh kata1 demo
bash scripts/kata.sh kata1 explore
```

## Exemplo Concreto de Entrada e Saída

### Entrada

| Ordem de entrada | Nome | Idade | Urgência declarada | Chegada | Ajuste aplicado |
| --- | --- | ---: | --- | --- | --- |
| 1 | Ana | 35 | BAIXA | 08:00 | permanece `BAIXA` |
| 2 | Bruno | 65 | MÉDIA | 08:05 | sobe para `ALTA` pela regra 4 |
| 3 | Carla | 15 | MÉDIA | 08:10 | sobe para `ALTA` pela regra 5 |
| 4 | Diego | 10 | CRÍTICA | 08:15 | continua `CRÍTICA` (teto) |
| 5 | Eva | 25 | CRÍTICA | 08:20 | permanece `CRÍTICA` |

### Saída ordenada

| Posição final | Nome | Urgência final | Motivo do desempate |
| --- | --- | --- | --- |
| 1 | Diego | CRÍTICA | chegou antes de Eva |
| 2 | Eva | CRÍTICA | segunda entre os críticos |
| 3 | Bruno | ALTA | chegou antes de Carla |
| 4 | Carla | ALTA | mesma urgência final, mas chegou depois |
| 5 | Ana | BAIXA | menor prioridade |

## FIFO Explícito com Exemplo Numérico

Se três pacientes entram com a mesma urgência final `ALTA` nos horários `08:05`, `08:09` e `08:12`, a saída precisa ser exatamente essa mesma ordem: `08:05 -> 08:09 -> 08:12`.

Se houver empate exato de horário, por exemplo duas entradas `ALTA` ambas às `09:10`, o algoritmo usa a posição original no lote como critério final de desempate. Isso preserva FIFO auditável mesmo quando os timestamps são iguais até o minuto.

## Tabela Comparativa de Abordagens

| Abordagem | Custo principal | Quando usar | Trade-off |
| --- | --- | --- | --- |
| Lista + sort em batch | `O(n log n)` | lote fechado, kata atual | mais simples e mais legível |
| `heapq` / priority queue | inserção `O(log n)` / extração `O(log n)` | fluxo contínuo com retirada frequente | pior legibilidade para explicar FIFO e empate exato |
| `TriageBucketQueue` com 4 deques | inserção `O(1)` / retirada `O(1)` | operação contínua com poucas prioridades fixas | exige pré-condição de chegada ordenada no bucket |
| SQL + `ORDER BY`/VIEW | depende de índice e volume | persistência, auditoria, concorrência | adiciona infraestrutura e custo transacional |

## Por Que a Solução Principal Não Usa `heapq`

`heapq` é boa quando a fila está sendo montada e consumida continuamente, mas o problema pedido no enunciado é diferente: recebe um conjunto de pacientes e devolve a fila final já ordenada.

Nesse cenário, `sort` é a escolha mais direta porque:

- o lote inteiro já está disponível;
- a chave de ordenação fica explícita em uma tupla simples;
- estabilidade e desempate final ficam fáceis de auditar;
- não preciso montar uma estrutura incremental para depois extrair tudo novamente.

Por isso deixei `heapq` apenas como alternativa discutida, não como implementação principal.

## `str` vs `Enum` para Urgência

Avaliei migrar a urgência para `Enum`, mas mantive `str` como contrato de entrada.

### Motivo da decisão

- o dataset do enunciado chega como texto;
- a versão SQL e a vitrine também trafegam rótulos textuais;
- a função `canonical_urgency()` já centraliza validação e normalização;
- usar `Enum` aqui aumentaria adaptação de entrada/saída sem melhorar o comportamento observável.

Se o domínio crescesse para múltiplos módulos Python internos, o `Enum` passaria a valer mais a pena como tipo canônico interno.

## Determinismo e Reprodutibilidade

A fila de triagem precisa ser auditável. Duas execuções com a mesma entrada devem produzir exatamente a mesma saída.

Foi por isso que a chave de ordenação final é:

1. prioridade ajustada desc;
2. horário de chegada asc;
3. índice original asc.

O terceiro critério é o que garante determinismo mesmo em empate exato. Sem ele, a fila dependeria de detalhes acidentais do lote de entrada ou do banco.

## Limitações Atuais do Modelo

- não há repriorização dinâmica após o paciente entrar na fila;
- não há cancelamento de entrada;
- não há múltiplas chegadas concorrentes já persistindo no banco;
- o timestamp `HH:MM` assume relógio local da clínica, sem timezone;
- a solução principal continua sendo de lote, não de fila viva.

Essas limitações são aceitáveis para o kata porque o enunciado pede a fila ordenada de uma lista recebida, não um sistema de triagem em tempo real.

## Crescimento do Dataset e Evolução do Banco

Se a fila passar a lidar com volumes muito maiores e consultas paginadas, o próximo passo no banco seria separar dois cenários:

- consulta operacional da fila aberta: índice focado em `queue_id`, `status`, prioridade e chegada;
- histórico fechado: paginação por data e filtros administrativos.

Em um banco como PostgreSQL, eu consideraria:

- índice parcial para filas abertas (`WHERE status = 'WAITING'`);
- paginação por cursor em vez de `OFFSET` para listas longas;
- materialização do ranking ajustado se a regra passasse a ficar mais cara.

Isso evita que o mesmo índice tente servir igualmente bem a fila operacional e os relatórios históricos.

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
