const ROUTES = [
  { id: "overview", label: "Visão Geral" },
  { id: "execucao", label: "Execução" },
  { id: "docs", label: "Docs" },
  { id: "kata-1", label: "Kata 1" },
  { id: "kata-2", label: "Kata 2" },
  { id: "kata-3", label: "Kata 3" },
  { id: "kata-4", label: "Kata 4" },
];

const ROUTE_DESCRIPTIONS = {
  overview: "Mapa geral da entrega e pontos de entrada do repositório.",
  execucao: "Comandos permitidos, retorno em tela e atalhos oficiais.",
  docs: "Leitura dos arquivos Markdown sem sair do showcase.",
  "kata-1": "Algoritmo, testes, análise e playground visual.",
  "kata-2": "Produto full-stack, estrutura e validação.",
  "kata-3": "Plano técnico, riscos e decisão de arquitetura.",
  "kata-4": "Pipeline, indicadores e saídas geradas.",
};

const NAV_GROUPS = [
  {
    title: "Projeto",
    routes: ["overview", "execucao", "docs"],
  },
  {
    title: "Katas",
    routes: ["kata-1", "kata-2", "kata-3", "kata-4"],
  },
];

const SCOPE_LABELS = {
  repo: "Repositório",
  "kata-1": "Kata 1",
  "kata-2": "Kata 2",
  "kata-3": "Kata 3",
  "kata-4": "Kata 4",
  showcase: "Showcase",
};

const PRIMARY_ROUTE_STEPS = {
  overview: "Passo 1",
  execucao: "Passo 2",
  docs: "Passo 3",
};

const MODE_CARDS = [
  {
    title: "Runner oficial",
    text: "Menu em bash com o fluxo principal do projeto e destaque do que atende diretamente ao enunciado.",
    command: "bash scripts/kata.sh",
  },
  {
    title: "Comandos manuais",
    text: "Execução direta por pasta, útil para revisão detalhada e para demonstrar que cada kata continua acessível sem camada extra.",
    command: "bash scripts/kata.sh help",
  },
  {
    title: "Showcase visual",
    text: "Portal navegável do repositório com páginas por kata, catálogo de comandos permitidos e retorno em tela.",
    command: "bash scripts/kata.sh showcase serve",
  },
];

const ROUTE_CARDS = [
  {
    route: "overview",
    title: "Visão Geral",
    text: "Mapa do repositório, stacks escolhidas, separação de código e artefatos e caminhos principais de execução.",
  },
  {
    route: "execucao",
    title: "Execução",
    text: "Catálogo de comandos permitidos no showcase, com retorno de execução em tela e opção de copiar o comando real.",
  },
  {
    route: "docs",
    title: "Docs",
    text: "Leitura interna dos arquivos Markdown do repositório, agrupados por escopo.",
  },
  {
    route: "kata-1",
    title: "Kata 1",
    text: "Algoritmo, análise, comandos e playground visual da fila de triagem.",
  },
  {
    route: "kata-2",
    title: "Kata 2",
    text: "Produto full-stack, estrutura backend/frontend, testes, endpoints e artefatos separados.",
  },
  {
    route: "kata-3",
    title: "Kata 3",
    text: "Documento de diagnóstico, plano de ação, arquitetura e RNFs.",
  },
  {
    route: "kata-4",
    title: "Kata 4",
    text: "Pipeline, indicadores, saídas geradas e decisões de tratamento de dados.",
  },
];

const REVIEW_FLOW = [
  {
    step: "01",
    route: "overview",
    title: "Entenda a entrega",
    text: "Veja o mapa do repositório, a stack escolhida e o que é código, documentação ou artefato.",
  },
  {
    step: "02",
    route: "execucao",
    title: "Valide o projeto",
    text: "Comece pelos comandos recomendados e analise o retorno real sem sair do showcase.",
  },
  {
    step: "03",
    route: "docs",
    title: "Leia a argumentação",
    text: "Abra os Markdown principais para revisar requisitos, engenharia, testes e o plano técnico.",
  },
  {
    step: "04",
    route: "kata-2",
    title: "Aprofunde por kata",
    text: "Quando quiser detalhe, entre nas páginas específicas e explore cada entrega no próprio contexto.",
  },
];

const PRIMARY_DOC_IDS = [
  "repo-readme",
  "kata2-requisitos",
  "kata2-engenharia",
  "kata3-plano",
  "kata4-analysis",
];

const KATA_SPOTLIGHTS = {
  "kata-1": {
    eyebrow: "Fluxo Sugerido",
    title: "Valide o algoritmo e depois explore os casos",
    text: "Comece pela demo e pela análise escrita. O playground visual fica como apoio para entender comportamento e volume.",
    actions: [
      { kind: "run", value: "kata1-demo", label: "Rodar demo" },
      { kind: "doc", value: "kata1-analysis", label: "Abrir análise", route: "docs" },
    ],
  },
  "kata-2": {
    eyebrow: "Fluxo Sugerido",
    title: "Revise primeiro o produto, depois a estrutura",
    text: "A sequência mais útil aqui é validar a suíte offline, abrir a engenharia da solução e só então entrar nos detalhes de pasta, endpoint e artefato.",
    actions: [
      { kind: "run", value: "kata2-all", label: "Rodar suíte" },
      { kind: "doc", value: "kata2-engenharia", label: "Abrir engenharia", route: "docs" },
    ],
  },
  "kata-3": {
    eyebrow: "Fluxo Sugerido",
    title: "Leia a síntese executiva antes do documento inteiro",
    text: "Esta kata é analítica. O caminho mais eficiente é absorver os riscos principais e depois abrir o PLANO.md completo na própria página.",
    actions: [
      { kind: "doc", value: "kata3-plano", label: "Abrir documento", route: "kata-3" },
      { kind: "route", value: "docs", label: "Ir para central de docs" },
    ],
  },
  "kata-4": {
    eyebrow: "Fluxo Sugerido",
    title: "Execute o pipeline e confirme a análise",
    text: "Primeiro gere as saídas para ver o resultado da transformação. Depois leia a análise para entender as decisões de normalização e escala.",
    actions: [
      { kind: "run", value: "kata4-pipeline", label: "Rodar pipeline" },
      { kind: "doc", value: "kata4-analysis", label: "Abrir análise", route: "docs" },
    ],
  },
};

const OVERVIEW_HIGHLIGHTS = [
  {
    title: "4 entregas independentes",
    text: "O repositório mantém as quatro katas isoladas por contexto para facilitar leitura, execução e avaliação.",
  },
  {
    title: "3 stacks principais",
    text: "Python nas Katas 1 e 4, C#/.NET no backend da Kata 2 e React + TypeScript no frontend.",
  },
  {
    title: "Código separado de artefatos",
    text: "A Kata 2 passa a deixar explícito o que é código autoral e o que é saída local de build, coverage ou log.",
  },
];

const REPOSITORY_PATHS = [
  { label: "README raiz", path: "README.md" },
  { label: "Runner oficial", path: "scripts/kata.sh" },
  { label: "Showcase", path: "showcase/" },
  { label: "Catálogo de docs", path: "showcase -> Docs" },
  { label: "Kata 2 · backend", path: "kata-2/backend/" },
  { label: "Kata 2 · frontend", path: "kata-2/frontend/" },
  { label: "Kata 2 · testes", path: "kata-2/backend.tests/" },
  { label: "Kata 2 · artefatos", path: "kata-2/artifacts/" },
];

const KATA_PAGES = {
  "kata-1": {
    title: "Kata 1 · Fila de Triagem",
    subtitle: "Lógica e algoritmos",
    summary:
      "Implementação em Python com foco em regras de negócio, testes unitários, análise escrita e exploração visual do comportamento da fila.",
    files: [
      "kata-1/triage.py",
      "kata-1/ANALISE.md",
      "kata-1/test_triage.py",
      "kata-1/schema.sql",
    ],
    notes: [
      "Fila ordenada por urgência ajustada e FIFO por horário dentro do mesmo nível final.",
      "Regras 4 e 5 tratadas explicitamente com casos de borda 59/60 e 17/18.",
      "Playground visual do showcase mantido como apoio; o terminal continua sendo a validação formal.",
    ],
    docIds: ["kata1-analysis", "kata1-readme"],
    commandIds: ["kata1-demo", "kata1-tests", "kata1-verify", "kata1-explore"],
  },
  "kata-2": {
    title: "Kata 2 · Painel de Tarefas",
    subtitle: "Feature full-stack",
    summary:
      "Produto com backend .NET e frontend React + TypeScript, board com múltiplos estados, prioridade, arquivamento e descrição enriquecida por indicadores como responsáveis, prazo, labels e checklist.",
    files: [
      "kata-2/REQUISITOS.md",
      "kata-2/backend/",
      "kata-2/frontend/",
      "kata-2/backend.tests/",
      "kata-2/artifacts/",
    ],
    notes: [
      "A estrutura foi simplificada para backend/frontend/backend.tests em vez do caminho antigo TaskBoard.Api/TaskBoard.Web.",
      "A descrição do card aceita marcadores leves inspirados em ferramentas como Trello para destacar responsável, prazo, labels e checklist sem exigir outro formulário gigante.",
      "Logs, build e coverage foram empurrados para artifacts para não parecerem código do projeto.",
      "O showcase não substitui o frontend real da Kata 2; ele apenas ajuda a revisar o repositório.",
    ],
    docIds: ["kata2-readme", "kata2-requisitos", "kata2-engenharia", "kata2-testes"],
    commandIds: [
      "kata2-dev",
      "kata2-all",
      "kata2-backend-tests",
      "kata2-api-tests",
      "kata2-frontend-lint",
      "kata2-frontend-tests",
      "kata2-frontend-build",
    ],
    endpoints: [
      "GET /tasks",
      "GET /tasks?status=pending|in_progress|completed|cancelled|archived",
      "GET /tasks/{id}",
      "POST /tasks",
      "PATCH /tasks/{id}",
      "DELETE /tasks/{id}",
      "GET /health",
      "GET /openapi/v1.json",
    ],
    artifacts: [
      "kata-2/artifacts/logs/backend.log",
      "kata-2/artifacts/frontend/dist",
      "kata-2/artifacts/frontend/coverage",
    ],
  },
  "kata-3": {
    title: "Kata 3 · Sistema Legado em Colapso",
    subtitle: "Análise de engenharia",
    summary:
      "Documento técnico focado em diagnóstico, priorização, plano de ação, decisão de arquitetura e RNFs comprometidos.",
    files: ["kata-3/PLANO.md"],
    notes: [
      "Sem código de produto: a entrega é deliberadamente analítica.",
      "O valor está na priorização dos riscos, não em refatoração especulativa.",
      "A escolha entre refatoração incremental e reescrita foi tratada com trade-off explícito.",
    ],
    docIds: ["kata3-plano"],
    sections: [
      "Diagnóstico dos 5 problemas relatados",
      "Plano de ação para os 3 problemas priorizados",
      "Decisão entre refatoração incremental e reescrita",
      "RNFs comprometidos com métricas mensuráveis",
    ],
    commandIds: [],
  },
  "kata-4": {
    title: "Kata 4 · Pipeline de Indicadores",
    subtitle: "Transformação de dados",
    summary:
      "Pipeline determinístico em Python para normalizar CSVs, gerar consolidado por pedido e calcular indicadores da operação.",
    files: [
      "kata-4/pipeline.py",
      "kata-4/ANALISE.md",
      "kata-4/test_pipeline.py",
      "kata-4/output/",
    ],
    notes: [
      "Tratamento explícito de datas mistas, valores monetários inconsistentes, nulos obrigatórios e registros órfãos.",
      "As saídas ficam em kata-4/output para inspeção técnica e reprocessamento idempotente.",
      "A análise escrita cobre idempotência, escala e estratégia de testes.",
    ],
    docIds: ["kata4-analysis"],
    outputs: ["kata-4/output/consolidated.csv", "kata-4/output/indicators.json"],
    commandIds: ["kata4-pipeline", "kata4-tests"],
  },
};

const KATA3_HIGHLIGHTS = [
  {
    title: "Top 3 prioridades",
    text: "Idempotência em pedidos, diagnóstico da consulta lenta e testes de caracterização como rede de segurança.",
  },
  {
    title: "Decisão de arquitetura",
    text: "Refatoração incremental em vez de reescrita, por causa do risco alto e da ausência de testes.",
  },
  {
    title: "Ganhos mensuráveis",
    text: "Zero duplicados por 2 semanas, p95 ≤ 500 ms e cobertura mínima nos fluxos críticos.",
  },
  {
    title: "Foco da entrega",
    text: "Análise madura de risco, priorização e governança, sem fingir que o problema se resolve só com código.",
  },
];

const URGENCY_PRIORITY = {
  BAIXA: 1,
  "MÉDIA": 2,
  ALTA: 3,
  "CRÍTICA": 4,
};

const PRIORITY_URGENCY = {
  1: "BAIXA",
  2: "MÉDIA",
  3: "ALTA",
  4: "CRÍTICA",
};

const BROWSER_VOLUME_LIMIT = 2_000;
const VOLUME_API_LIMIT = 20_000;
const VOLUME_SIMULATION_BUDGET_MS = 1_200;
const VOLUME_FRAME_BUDGET_MS = 16;
const VOLUME_DEBOUNCE_MS = 120;
const VOLUME_API_POLL_MS = 300;
const VOLUME_PRESETS = [1, 20, 200, 2_000, 5_000, 10_000, 20_000];
const ANSI_SGR_RE = /\u001b\[([0-9;]*)m/g;

const explorerCases = [
  {
    id: "rule-1",
    label: "Regra 1",
    title: "Caso 1 · CRÍTICA sempre sobe para o topo",
    focus: "Mesmo chegando depois, o paciente crítico precisa liderar a fila.",
    patients: [
      { name: "Aline", age: 35, urgency: "BAIXA", arrival: "08:00" },
      { name: "Breno", age: 40, urgency: "ALTA", arrival: "08:01" },
      { name: "Caio", age: 29, urgency: "CRÍTICA", arrival: "08:10" },
      { name: "Dora", age: 50, urgency: "MÉDIA", arrival: "08:02" },
    ],
    expectedOrder: ["Caio", "Breno", "Dora", "Aline"],
  },
  {
    id: "rule-2",
    label: "Regra 2",
    title: "Caso 2 · ALTA vence MÉDIA e BAIXA",
    focus: "Sem paciente crítico, ALTA deve liderar mesmo chegando depois.",
    patients: [
      { name: "Elias", age: 41, urgency: "MÉDIA", arrival: "08:00" },
      { name: "Fabio", age: 36, urgency: "BAIXA", arrival: "08:01" },
      { name: "Giulia", age: 33, urgency: "ALTA", arrival: "08:10" },
      { name: "Helena", age: 39, urgency: "MÉDIA", arrival: "08:02" },
    ],
    expectedOrder: ["Giulia", "Elias", "Helena", "Fabio"],
  },
  {
    id: "fifo",
    label: "FIFO",
    title: "Caso 3A · FIFO por horário",
    focus: "Mesma urgência final, desempate por hora de chegada.",
    patients: [
      { name: "Ivan", age: 28, urgency: "ALTA", arrival: "08:12" },
      { name: "Joana", age: 31, urgency: "ALTA", arrival: "08:05" },
      { name: "Kelly", age: 34, urgency: "ALTA", arrival: "08:09" },
    ],
    expectedOrder: ["Joana", "Kelly", "Ivan"],
  },
  {
    id: "elderly",
    label: "59/60",
    title: "Caso 4 · Borda 59/60",
    focus: "Aqui o alvo é a promoção do idoso apenas a partir dos 60 anos.",
    patients: [
      { name: "Nora", age: 59, urgency: "MÉDIA", arrival: "08:20" },
      { name: "Omar", age: 60, urgency: "MÉDIA", arrival: "08:21" },
      { name: "Paula", age: 72, urgency: "ALTA", arrival: "08:22" },
      { name: "Rui", age: 70, urgency: "CRÍTICA", arrival: "08:23" },
    ],
    expectedAdjustments: {
      Nora: "MÉDIA",
      Omar: "ALTA",
      Paula: "ALTA",
      Rui: "CRÍTICA",
    },
  },
  {
    id: "minor",
    label: "17/18",
    title: "Caso 5 · Menor ganha +1 nível",
    focus: "O cenário cobre promoção, teto em CRÍTICA e borda de 18 anos.",
    patients: [
      { name: "Igor", age: 17, urgency: "BAIXA", arrival: "08:30" },
      { name: "Julia", age: 15, urgency: "MÉDIA", arrival: "08:31" },
      { name: "Kai", age: 16, urgency: "ALTA", arrival: "08:32" },
      { name: "Lia", age: 10, urgency: "CRÍTICA", arrival: "08:33" },
      { name: "Mara", age: 18, urgency: "BAIXA", arrival: "08:34" },
    ],
    expectedAdjustments: {
      Igor: "MÉDIA",
      Julia: "ALTA",
      Kai: "CRÍTICA",
      Lia: "CRÍTICA",
      Mara: "BAIXA",
    },
  },
  {
    id: "normalization",
    label: "Normalização",
    title: "Caso 6 · Parsing flexível sem quebrar a fila",
    focus: "Entradas em formatos diferentes continuam obedecendo o contrato do domínio.",
    patients: [
      { name: "Diego", age: 16, urgency: "medium", arrival: "09:20" },
      { name: "Elisa", age: 30, urgency: "CRITICA", arrival: "2026-04-20T09:15:00" },
      { name: "Fernanda", age: 61, urgency: "MEDIUM", arrival: "09:18" },
    ],
    expectedOrder: ["Elisa", "Fernanda", "Diego"],
  },
];
