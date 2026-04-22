# Kata 3 — Sistema Legado em Colapso

## TL;DR

- **Top 3 prioridades**: (1) idempotência em `POST /orders` para eliminar duplicidade, (2) diagnóstico e correção da consulta lenta (p95 8–12 s → ≤ 500 ms), (3) testes de caracterização para virar rede de segurança dos próximos passos.
- **Decisão de arquitetura**: neste cenário, refatoração incremental do módulo de 4.000 linhas — ela equilibra melhor risco operacional, falta de testes e capacidade do time; a reescrita passa a fazer mais sentido quando houver isolamento, contratos conhecidos e migração controlada.
- **Ganhos mensuráveis**: zero duplicados em relatório diário por 2 semanas, p95 ≤ 500 ms sob pico, cobertura ≥ 70% nos fluxos críticos e 100% dos deploys via pipeline com revisão.

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
  3. Envolver criação de pedido em transação; persistir `response_status` e `response_body` e, no retry com mesmo payload, reapresentar a mesma resposta original em vez de criar novo pedido ou cair em `500`.
  4. Ajustar clientes/mobile/backend de retentativa para reutilizar a mesma chave em retry.
  5. Adicionar logs de duplicidade (chave, cliente, origem) para monitorar pós-implantação.
- **Esforço estimado**: 2–3 dias (1 dia de implementação + 1 dia de testes de integração + 0.5 dia de coordenação com clientes/frontends + 0.5 dia de monitoramento).
- **Critério de sucesso**:
  - Zero pedidos duplicados detectados no relatório diário durante duas semanas seguidas.
  - Logs mostram chaves idempotentes colidindo (retry funcionando corretamente) sem criar novo registro.
  - Teste de integração automatizado comprova que duas requisições idênticas geram um único pedido.
- **Schema proposto** (`order_idempotency_keys`):

```sql
CREATE TABLE order_idempotency_keys (
    idempotency_key  VARCHAR(80)  NOT NULL,
    client_id        UUID         NOT NULL,
    order_id         UUID         NOT NULL,
    request_hash     CHAR(64)     NOT NULL,  -- SHA-256 do payload normalizado
    response_status  SMALLINT     NOT NULL,
    response_body    JSONB        NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ  NOT NULL, -- TTL (ex.: created_at + 24h)
    CONSTRAINT pk_order_idempotency_keys PRIMARY KEY (client_id, idempotency_key),
    CONSTRAINT fk_order_idempotency_keys_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
);

CREATE INDEX ix_order_idempotency_keys_expires_at
    ON order_idempotency_keys (expires_at);
```

Regra: ao chegar um `POST /orders` com `Idempotency-Key`, a aplicação procura
por `(client_id, idempotency_key)`. Se existir e `request_hash` bater, devolve
a mesma `(response_status, response_body)` sem criar pedido novo; se bater a
chave mas o payload divergir, responde `409 Conflict`; se não existir, cria
o pedido dentro da mesma transação que insere a linha aqui. Uma rotina varre
`expires_at` para limpar chaves antigas.

### Ação 2 — Investigar e mitigar a consulta lenta (P0)

- **O que será feito (técnico)**:
  1. Medir a query real em produção com `EXPLAIN ANALYZE` (ou equivalente) sobre volume representativo.
  2. Identificar o gargalo: índice ausente, full scan, join ineficiente, N+1, ou regra de negócio no caminho crítico.
  3. Aplicar a correção segura mínima: criar índice, adicionar paginação obrigatória, mover cálculos para materialização ou cache curto.
  4. Incluir SLO de 500 ms p95 no endpoint e alerta em violação sustentada.
  5. Validar com teste de carga controlado (k6/JMeter) simulando o pico observado.
- **Esforço estimado**: 3–5 dias (1 dia de análise + 1–2 dias de correção + 1 dia de validação de carga + 0.5 dia de ajuste de monitoramento).
- **Critério de sucesso**:
  - p95 do endpoint cai de 8–12 s para ≤ 500 ms em produção, medido durante o próximo pico.
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

**As duas opções são válidas. Neste contexto, eu escolheria a Opção A — Refatoração incremental.**

### Matriz de decisão — refatoração × reescrita

| Critério | Refatoração incremental | Reescrita do zero |
| --- | --- | --- |
| Comportamento atual não está capturado por testes | Permite primeiro caracterizar o que o sistema faz e só depois mexer na estrutura | Exige muito mais confiança na leitura do legado para não reconstruir regras erradas |
| Módulo ainda sofre incidentes e hotfixes | Permite corrigir produção e refatorar no mesmo fluxo | Fica vulnerável a desvio de escopo se o legado continuar mudando enquanto a nova versão é escrita |
| Momento em que o risco aparece | O risco fica distribuído em mudanças pequenas | O maior risco se concentra no corte para o módulo novo |
| Quando faz mais sentido | Quando o problema principal é risco operacional com baixa previsibilidade | Quando o módulo está isolado, o comportamento é conhecido e existe capacidade real para migração planejada |

### Por que eu escolheria A neste cenário

Escolho A **não porque B seja “ruim”**, mas porque o contexto descrito favorece fortemente uma abordagem incremental:

1. **Sistema em produção sem testes**: antes de trocar o motor, eu preciso capturar o comportamento atual. A refatoração incremental permite criar essa proteção enquanto extraio partes do módulo.
2. **O legado continua mudando enquanto está problemático**: aqui não é apenas “time ocupado”. O módulo ainda sofre com incidentes, hotfixes e correções urgentes. A refatoração incremental permite corrigir o sistema real e melhorar sua estrutura no mesmo fluxo. Já a reescrita do zero fica mais frágil quando o comportamento do legado continua se deslocando semana após semana.
3. **Problemas operacionais já ativos**: há lentidão, duplicidade e ausência de governança. O time precisa atacar risco agora, não apostar tudo num corte futuro.
4. **Baixa clareza sobre regras escondidas**: um arquivo de 4.000 linhas em sistema legado costuma guardar exceções de negócio que nem sempre estão documentadas. Descobrir isso aos poucos tende a ser mais seguro.

### Em que cenário eu escolheria B

Eu escolheria a **Opção B — Reescrita do zero** se o contexto mudasse para algo como:

- o módulo estivesse **bem isolado**, com entradas e saídas claras e poucas integrações laterais;
- o comportamento atual já estivesse **mapeado por testes, logs e contratos**, reduzindo o risco de reconstrução incorreta;
- houvesse **time dedicado** ou pelo menos capacidade real para sustentar o esforço sem abandonar a operação;
- existisse uma necessidade estratégica mais forte, como **troca obrigatória de stack**, fim de suporte da tecnologia atual ou limitações estruturais que tornassem a refatoração antieconômica;
- a migração pudesse ser feita com **cutover controlado**, feature flag, shadow traffic ou operação paralela observável.

Em outras palavras: **A é a melhor escolha para o cenário descrito; B passa a ser melhor quando o contexto oferece isolamento, entendimento, capacidade e justificativa estratégica suficientes para assumir o risco de um redesenho completo**.

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

## Seção 5 — Quadro Executivo de Execução

| Prioridade | Horizonte | Ação | Dependências | Rollback |
| --- | --- | --- | --- | --- |
| P0 | 24h | Bloquear duplicidade com idempotência e restrição única | ajuste no endpoint de criação, apoio do time cliente para reutilizar chave | remover validação nova e desabilitar uso da chave temporariamente |
| P0 | 24h - 7d | Mitigar lentidão do endpoint de pedidos com análise real de query e correção mínima segura | acesso a banco, plano de execução e janela controlada de deploy | remover índice novo ou desfazer alteração de query/materialização |
| P1 | 7d | Criar testes de caracterização para criação de pedido e consulta crítica | ambiente de teste com banco equivalente e CI existente | rollback simples por revert do pipeline de teste, sem impacto funcional |
| P1 | 7d - 30d | Fechar governança de mudança: PR obrigatório, pipeline e gate de deploy | alinhamento do time e permissão de branch | desabilitar bloqueio temporariamente em caso de incidente, com registro formal |
| P2 | 30d | Iniciar refatoração incremental do módulo de 4.000 linhas | testes de caracterização mínimos e mapeamento de fronteiras do módulo | reverter módulo extraído por feature flag ou retorno ao adaptador anterior |
