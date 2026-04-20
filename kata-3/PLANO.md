# Kata 3 — Sistema Legado em Colapso

Plano técnico organizado nas quatro seções exigidas pelo teste: diagnóstico problema a problema, plano de ação para as três maiores prioridades, decisão de arquitetura argumentada e requisitos não funcionais ignorados com métricas de monitoramento.

## Seção 1 — Diagnóstico

Cada um dos cinco problemas relatados é analisado por (a) causa raiz mais provável, (b) risco técnico e de negócio, (c) classificação pela Matriz de Eisenhower em urgente/importante.

### Problema 1 — Endpoint de consulta de pedidos lento (8–12s em pico)

- **Causa raiz provável**: ausência de índices nas colunas de filtro/ordenação, consulta executando joins pesados sem paginação eficiente, ou lógica de negócio dentro do caminho crítico da query (cálculos que deveriam ser materializados).
- **Risco técnico**: saturação do banco em horário de pico, timeouts em cascata e efeito dominó em outros serviços que compartilham o mesmo pool.
- **Risco de negócio**: atendimento comprometido, carrinhos abandonados, reputação afetada e perda direta de receita em horários de maior conversão.
- **Eisenhower**: **Urgente e Importante**. Afeta usuário final agora e degrada durante o pico de negócio.

### Problema 2 — Pedidos criados em duplicidade

- **Causa raiz provável**: falta de idempotência no endpoint de criação, ausência de restrição única de negócio (ex.: `client_id` + `order_hash`), retentativa do cliente ou da fila sem chave idempotente, ou corrida entre duas chamadas quase simultâneas.
- **Risco técnico**: inconsistência no estado de pedidos, reconciliações manuais, integrações downstream corrompidas (estoque, cobrança, logística).
- **Risco de negócio**: cobrança em dobro do cliente, risco regulatório (PROCON), retrabalho do atendimento, erosão de confiança.
- **Eisenhower**: **Urgente e Importante**. Afeta diretamente dinheiro e confiança.

### Problema 3 — Bug de frete corrigido direto em produção sem PR/teste

- **Causa raiz provável**: processo de mudança frágil — ausência de política de code review obrigatório, pipeline de deploy sem gate de testes, cultura permissiva em emergências.
- **Risco técnico**: regressões silenciosas, impossibilidade de rastrear e reverter a mudança com segurança, divergência entre código em produção e repositório.
- **Risco de negócio**: erros de cálculo podem afetar margem por pedido em escala, e uma regressão em cima desse hotfix pode parar o fluxo de checkout.
- **Eisenhower**: **Importante, não urgente no mesmo instante**, mas **urgente preventivamente** — porque é processo, e sem processo novos incidentes irão se repetir.

### Problema 4 — Arquivo de 4.000 linhas na camada de negócio

- **Causa raiz provável**: ausência de modularização, acúmulo histórico de regras, falta de refatoração contínua, ausência de testes que permitam extrair módulos com segurança.
- **Risco técnico**: qualquer mudança tem custo alto, o tempo de onboarding é elevado, o risco de regressão cresce a cada alteração, e a cobertura de testes futura é difícil de ampliar.
- **Risco de negócio**: velocidade do time cai, prazos estouram e bugs aparecem em áreas aparentemente desconexas.
- **Eisenhower**: **Importante, não urgente**. Não derruba produção hoje, mas amplifica todos os outros problemas ao longo do tempo.

### Problema 5 — Ausência total de testes automatizados

- **Causa raiz provável**: cultura focada em entrega rápida sem gate de qualidade, ausência de caracterização do sistema legado, base de código acoplada que dificulta testar isoladamente.
- **Risco técnico**: cada mudança é um risco cego, refatoração é inviável, regressões reaparecem e ninguém consegue provar conformidade de comportamento.
- **Risco de negócio**: incidentes em produção recorrentes, tempo de correção elevado, custo de manutenção crescente e dependência forte de conhecimento tácito da equipe.
- **Eisenhower**: **Importante, não urgente**. Habilitador de todas as outras correções de forma segura.

### Matriz de Eisenhower (resumo)

| | Urgente | Não urgente |
| --- | --- | --- |
| **Importante** | Problemas 1 e 2 | Problemas 3, 4 e 5 |
| **Não importante** | — | — |

## Seção 2 — Plano de Ação (Top 3 Priorizados)

Escolho as três ações que mais reduzem risco imediato e habilitam as demais: duplicidade, performance e teste de caracterização sobre os fluxos tocados.

### Ação 1 — Impedir pedidos duplicados (P0)

- **O que será feito (técnico)**:
  1. Adicionar chave de idempotência (`Idempotency-Key` no header) no endpoint `POST /orders`; persistir em tabela `order_idempotency_keys` com TTL.
  2. Criar restrição única de negócio em `(client_id, idempotency_key)`.
  3. Envolver criação de pedido em transação; tratar violação de unique devolvendo o pedido já existente (`200` com o recurso), não `500`.
  4. Ajustar clientes/mobile/backend de retentativa para reutilizar a mesma chave em retry.
  5. Adicionar logs de duplicidade (chave, cliente, origem) para monitorar pós-implantação.
- **Esforço estimado**: 2–3 dias (1 dia de implementação + 1 dia de testes de integração + 0.5 dia de coordenação com clientes/frontends + 0.5 dia de monitoramento).
- **Critério de sucesso**:
  - Zero pedidos duplicados detectados no relatório diário durante duas semanas seguidas.
  - Logs mostram chaves idempotentes colidindo (retry funcionando corretamente) sem criar novo registro.
  - Teste de integração automatizado comprova que duas requisições idênticas geram um único pedido.

### Ação 2 — Investigar e mitigar a consulta lenta (P0)

- **O que será feito (técnico)**:
  1. Medir a query real em produção com `EXPLAIN ANALYZE` (ou equivalente) sobre volume representativo.
  2. Identificar o gargalo: índice ausente, full scan, join ineficiente, N+1, ou regra de negócio no caminho crítico.
  3. Aplicar a correção segura mínima: criar índice, adicionar paginação obrigatória, mover cálculos para materialização ou cache curto.
  4. Incluir SLO de 500 ms p95 no endpoint e alerta em violação sustentada.
  5. Validar com teste de carga controlado (k6/JMeter) simulando o pico observado.
- **Esforço estimado**: 3–5 dias (1 dia de análise + 1–2 dias de correção + 1 dia de validação de carga + 0.5 dia de ajuste de monitoramento).
- **Critério de sucesso**:
  - p95 do endpoint cai de 8–12 s para ≤ 1 s em produção, medido durante o próximo pico.
  - Teste de carga repetível mantém p95 estável sob carga equivalente ao pico observado.
  - Alerta de SLO silencia por pelo menos duas semanas consecutivas.

### Ação 3 — Testes de caracterização para criação de pedido e consulta crítica (P1)

- **O que será feito (técnico)**:
  1. Escrever testes de integração que executem contra um banco equivalente ao de produção, cobrindo: criação normal, retry com idempotência, retry sem idempotência, consulta em pico, consulta com filtros combinados.
  2. Registrar em cada teste a assinatura atual de comportamento (inputs → outputs/estado esperado).
  3. Plugar estes testes no pipeline de CI como gate obrigatório.
  4. Documentar no README do projeto o objetivo dos testes (proteger refatorações futuras, não redefinir comportamento).
- **Esforço estimado**: 3–5 dias, podendo ser feito em paralelo com a Ação 1.
- **Critério de sucesso**:
  - 100% dos fluxos das Ações 1 e 2 têm ao menos um teste automatizado rodando em CI.
  - Pipeline bloqueia merge quando qualquer um desses testes falha.
  - Regressões introduzidas em um PR experimental (intencional) são detectadas pelo CI antes do merge.

## Seção 3 — Decisão de Arquitetura

**Escolho a Opção A — Refatoração incremental.**

**Argumentação**:

1. **Contexto de produção sem testes**: reescrever uma camada de 4.000 linhas sem rede de segurança é substituir uma caixa-preta por outra, mas com o sistema antigo ainda rodando e acumulando mudanças. O risco de regressão é extremamente alto, porque não existe verdade comportamental capturada.
2. **Time ocupado**: uma reescrita é historicamente um projeto paralelo que compete com manutenção. Num time já saturado, isso provoca abandono (nem a reescrita termina nem a manutenção avança) ou cria um *second system* com comportamento divergente, caro de reconciliar.
3. **Valor incremental**: extrair um módulo por vez mantém o sistema entregando valor ao negócio durante toda a transição. Cada módulo extraído recebe testes de caracterização, interfaces estáveis, e pode ser evoluído com segurança no próximo ciclo.
4. **Redução de risco por passo**: a refatoração incremental sempre mantém um estado funcional anterior a cada mudança. A reescrita só prova funcionar quando substitui 100% — que é exatamente o ponto em que regressões silenciosas aparecem em produção.
5. **Aprendizado iterativo**: extrair módulos pequenos revela regras de negócio escondidas cedo, quando ainda é barato mudar a fronteira. A reescrita redescobre essas regras tarde, quando o design já foi fechado.
6. **Compatibilidade com as Ações 1–3**: a refatoração incremental apoia-se nos testes de caracterização da Ação 3 como rede de segurança. A reescrita não tira proveito deles da mesma forma.

**Condições que poderiam inverter a decisão** (reconhecendo que não é dogma):

- Se o módulo fosse totalmente isolado, com entradas e saídas já bem definidas e testáveis.
- Se o time tivesse capacidade ociosa real (não é o caso).
- Se a stack do módulo estivesse sendo descontinuada, exigindo reescrita por motivos externos.

Nenhuma dessas condições se aplica ao contexto descrito. Portanto, refatoração incremental é a escolha mais defensável.

## Seção 4 — Requisitos Não Funcionais Ignorados

Cada RNF identificado vem acompanhado de uma **métrica mensurável** para monitoramento contínuo.

### RNF 1 — Desempenho

- **Por que está comprometido**: endpoint de pedidos responde em 8–12 s durante o pico, evidência direta de degradação de desempenho.
- **Métrica mensurável**: p95 de latência por endpoint (meta ≤ 500 ms), monitorada por dashboard de APM com alerta quando a meta for violada por mais de 5 minutos consecutivos.

### RNF 2 — Confiabilidade / Consistência

- **Por que está comprometido**: dois pedidos foram duplicados em uma semana. Isso revela ausência de idempotência e controle transacional.
- **Métrica mensurável**: quantidade de pedidos duplicados detectados por dia (meta = 0) e taxa de erro (5xx) do endpoint de criação abaixo de 0,1%.

### RNF 3 — Manutenibilidade

- **Por que está comprometido**: arquivo de 4.000 linhas na camada de negócio é símbolo direto de baixa manutenibilidade.
- **Métrica mensurável**: complexidade ciclomática média por arquivo (meta < 15) e percentual de arquivos com mais de 500 linhas (meta < 5%), medidos por ferramenta estática no CI.

### RNF 4 — Testabilidade

- **Por que está comprometido**: não há nenhum teste automatizado, portanto qualquer alteração é cega.
- **Métrica mensurável**: cobertura de testes em fluxos críticos (meta ≥ 70%) e número de fluxos críticos cobertos por teste de integração (meta = 100% dos fluxos de pedido e consulta).

### RNF 5 — Observabilidade

- **Por que está comprometido**: não existem indicadores citados para diagnóstico rápido de incidentes, o que sugere ausência de logs, métricas e alertas adequados.
- **Métrica mensurável**: tempo médio de detecção de incidente — MTTD (meta < 5 min) e tempo médio de recuperação — MTTR (meta < 30 min) para incidentes classificados como P0/P1.

### RNF 6 — Controle de Mudança / Governança

- **Por que está comprometido**: hotfix foi aplicado diretamente em produção sem PR e sem teste — processo frágil e não auditável.
- **Métrica mensurável**: percentual de deploys feitos via pipeline com revisão (meta = 100%) e percentual de mudanças com rollback documentado (meta = 100%).
