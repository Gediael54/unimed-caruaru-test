# Kata 3 - Sistema Legado em Colapso

## 1. Diagnóstico

O sistema apresenta vários riscos de produção acontecendo ao mesmo tempo:

- Consulta de pedidos lenta: pode indicar ausência de índices, joins ineficientes, carregamento excessivo de dados ou regras de negócio executando no caminho crítico da requisição.
- Pedidos duplicados: pode haver falta de idempotência, ausência de restrições únicas, retentativas inseguras ou condições de corrida.
- Hotfix direto em produção sem pull request ou testes: o controle de mudança está frágil e aumenta a chance de regressões.
- Arquivo de negócio com 4.000 linhas: as regras principais ficam difíceis de entender, testar e alterar.
- Ausência de testes automatizados: a equipe não consegue refatorar com segurança nem provar que correções emergenciais preservam o comportamento existente.

O problema de pedidos duplicados é o maior risco imediato, porque pode afetar cobrança, estoque, confiança do cliente e operação interna.

## 2. Plano de Ação

| Prioridade | Ação | Esforço | Critério de Sucesso |
| --- | --- | --- | --- |
| P0 | Impedir criação de pedidos duplicados com chave de idempotência ou restrição única de negócio. | 1-3 dias | Submissões repetidas para a mesma operação geram apenas um pedido. |
| P0 | Adicionar logs no fluxo de criação de pedido, retentativas, identificadores de usuário/sessão e callbacks de pagamento. | 1 dia | Relatos de duplicidade podem ser rastreados até um caminho específico. |
| P1 | Investigar a consulta lenta com plano de execução, tempos medidos e volume próximo ao real. | 1-2 dias | O gargalo principal é identificado e medido. |
| P1 | Aplicar a menor correção segura para a consulta lenta, como índice ou ajuste de query. | 1-3 dias | A latência cai para uma meta combinada sem quebrar o resultado. |
| P1 | Criar testes de caracterização para criação de pedidos e consulta crítica. | 2-5 dias | O comportamento atual fica protegido antes de refatorações maiores. |
| P2 | Exigir pull request, revisão e nota de rollback para mudanças em produção. | 1 dia | Hotfixes passam por revisão mínima e deixam trilha de auditoria. |
| P2 | Começar a extrair o arquivo de 4.000 linhas por capacidade de negócio estável. | Contínuo | Novas mudanças passam a entrar em módulos menores e testados. |

## 3. Decisão de Arquitetura

A abordagem correta é refatoração incremental, não reescrita completa.

Uma reescrita é arriscada porque o sistema está em produção, não possui testes automatizados e a equipe já está sobrecarregada. Reescritas costumam redescobrir regras de negócio escondidas tarde demais, enquanto o sistema antigo continua mudando.

O caminho mais seguro é:

1. Estabilizar a criação duplicada de pedidos e a consulta lenta.
2. Adicionar testes de caracterização para o comportamento atual.
3. Extrair uma capacidade de negócio por vez do arquivo grande.
4. Direcionar código novo para módulos menores, com entradas, saídas e testes claros.
5. Substituir caminhos críticos apenas depois que o comportamento estiver medido e coberto por testes.

## 4. Requisitos Não Funcionais Ignorados

- Performance: a consulta lenta indica que latência e escalabilidade não foram protegidas.
- Confiabilidade e consistência: pedidos duplicados mostram fragilidade em transações ou idempotência.
- Manutenibilidade: um arquivo de 4.000 linhas aumenta risco de mudança e custo de onboarding.
- Testabilidade: sem testes automatizados, a equipe não consegue alterar fluxos centrais com segurança.
- Observabilidade: os problemas descritos sugerem falta de logs, métricas, traces ou alertas suficientes.
- Controle de mudança: hotfixes diretos em produção sem revisão criam risco operacional evitável.
