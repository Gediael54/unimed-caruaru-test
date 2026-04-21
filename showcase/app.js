const modes = [
  {
    title: "Runner interativo",
    text: "Menu em bash com detecção de ambiente, destaque do que é obrigatório pelo enunciado e atalho para os fluxos principais e para o explorer da Kata 1.",
    command: "bash scripts/kata.sh",
  },
  {
    title: "Comandos manuais",
    text: "Execução direta por kata, útil para revisão detalhada, CI local e demonstração de que cada entrega continua acessível sem abstração extra.",
    command: "bash scripts/kata.sh help",
  },
  {
    title: "Showcase web",
    text: "Camada opcional de apresentação. Resume entregas, caminhos de execução, análises e trade-offs e, para volumes maiores, usa uma API local própria.",
    command: "bash scripts/kata.sh showcase serve",
  },
];

const katas = [
  {
    title: "Kata 1 · Fila de Triagem",
    summary: "Algoritmo em Python com testes, schema SQL opcional, validação executável e camada extra de exploração guiada.",
    badges: ["Python", "61 testes", "Schema SQL", "Saída auditável", "Explorer"],
    analysis: "kata-1/ANALISE.md",
    manual: "python3 kata-1/verify.py --mode demo",
    runner: "bash scripts/kata.sh kata1 explore",
  },
  {
    title: "Kata 2 · Painel de Tarefas",
    summary: "Backend .NET Web API, frontend React/TypeScript com visões em lista, kanban e timeline, testes por escopo e fluxo unificado para subir backend + frontend.",
    badges: ["C# / .NET", "React + TS", "OpenAPI", "Health check"],
    analysis: "kata-2/ENGENHARIA.md",
    manual: "dotnet run --project kata-2/src/TaskBoard.Api/TaskBoard.Api.csproj --urls http://localhost:5000",
    runner: "bash scripts/kata.sh kata2 dev",
  },
  {
    title: "Kata 3 · Sistema Legado",
    summary: "Plano de ação, diagnóstico, decisão entre refatoração e reescrita e registro explícito dos riscos e limites.",
    badges: ["Arquitetura", "RNFs", "Trade-offs", "Plano"],
    analysis: "kata-3/PLANO.md",
    manual: "sed -n '1,220p' kata-3/PLANO.md",
    runner: "Abra o documento diretamente",
  },
  {
    title: "Kata 4 · Pipeline de Indicadores",
    summary: "Pipeline determinístico para consolidar CSVs, calcular indicadores e produzir artefatos idempotentes.",
    badges: ["Python", "Determinístico", "Idempotência", "Indicadores"],
    analysis: "kata-4/ANALISE.md",
    manual: "python3 kata-4/pipeline.py",
    runner: "bash scripts/kata.sh kata4 pipeline",
  },
];

const analyses = [
  {
    title: "README raiz",
    description: "Mapa geral da entrega, formas de execução, fluxo manual e runner, além da justificativa da stack.",
    path: "../README.md",
  },
  {
    title: "Análise da Kata 1",
    description: "Decisões de algoritmo, estrutura de dados, escalabilidade, formato de demonstração executável e por que a exploração interativa ficou separada.",
    path: "../kata-1/ANALISE.md",
  },
  {
    title: "Engenharia da Kata 2",
    description: "Camadas do backend, confiabilidade, separação da vitrine geral e trade-offs do fluxo integrado.",
    path: "../kata-2/ENGENHARIA.md",
  },
  {
    title: "Análise da Kata 4",
    description: "Tratamento de dados, idempotência, escalabilidade e forma de apresentação do pipeline.",
    path: "../kata-4/ANALISE.md",
  },
];

const tradeoffs = [
  {
    title: "Showcase separado da Kata 2",
    text: "A vitrine web fica fora do produto da Kata 2 para não diluir o escopo do enunciado nem misturar o painel de tarefas com a apresentação do repositório.",
  },
  {
    title: "Evolução para API local própria",
    text: "A vitrine deixou de ser só uma página estática: acima de 2.000 pacientes ela passa a delegar a simulação para uma API local, para não congelar a interface.",
  },
  {
    title: "Exploração sem poluir a validação",
    text: "Casos isolados e simulação de volume entraram como camada opcional. O caminho principal continua curto, determinístico e automatizável.",
  },
  {
    title: "Terminal continua como fonte de verdade",
    text: "A vitrine ajuda a apresentar, mas a execução exigida continua acessível por bash e por comandos manuais. Isso preserva auditabilidade.",
  },
];

const commands = [
  {
    title: "Runner principal",
    description: "Abre o menu interativo com os fluxos agrupados.",
    command: "bash scripts/kata.sh",
  },
  {
    title: "Showcase web",
    description: "Sobe a vitrine com UI estática e API local para simulações maiores.",
    command: "bash scripts/kata.sh showcase serve",
  },
  {
    title: "Explorer da Kata 1",
    description: "Abre o modo exploratório para rodar casos isolados e simular volume.",
    command: "bash scripts/kata.sh kata1 explore",
  },
  {
    title: "Validação completa",
    description: "Executa o fluxo offline principal do repositório.",
    command: "bash scripts/kata.sh all validate",
  },
  {
    title: "Demo da Kata 1",
    description: "Roda os cenários executáveis do algoritmo com saída detalhada.",
    command: "python3 kata-1/verify.py --mode demo",
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
    title: "Caso 7 · Parsing flexível sem quebrar a fila",
    focus: "Entradas em formatos diferentes continuam obedecendo o contrato do domínio.",
    patients: [
      { name: "Diego", age: 16, urgency: "medium", arrival: "09:20" },
      { name: "Elisa", age: 30, urgency: "CRITICA", arrival: "2026-04-20T09:15:00" },
      { name: "Fernanda", age: 61, urgency: "MEDIUM", arrival: "09:18" },
    ],
    expectedOrder: ["Elisa", "Fernanda", "Diego"],
  },
];

let selectedCaseId = explorerCases[0].id;
let volumeRunToken = 0;
let volumeDebounceHandle = 0;
let activeVolumeJobId = null;

function renderModes() {
  const container = document.querySelector("#mode-grid");
  container.innerHTML = modes.map(
    (mode) => `
      <article class="mode-card">
        <h3>${mode.title}</h3>
        <p>${mode.text}</p>
        <code>${mode.command}</code>
      </article>
    `,
  ).join("");
}

function renderKatas() {
  const container = document.querySelector("#kata-grid");
  container.innerHTML = katas.map(
    (kata) => `
      <article class="kata-card">
        <h3>${kata.title}</h3>
        <p>${kata.summary}</p>
        <div class="badge-row">
          ${kata.badges.map((badge) => `<span class="badge">${badge}</span>`).join("")}
        </div>
        <div class="meta-list">
          <div class="meta-item">
            <span>Análise</span>
            <strong>${kata.analysis}</strong>
          </div>
          <div class="meta-item">
            <span>Manual</span>
            <strong>${kata.manual}</strong>
          </div>
          <div class="meta-item">
            <span>Runner</span>
            <strong>${kata.runner}</strong>
          </div>
        </div>
      </article>
    `,
  ).join("");
}

function renderAnalyses() {
  const container = document.querySelector("#analysis-list");
  container.innerHTML = analyses.map(
    (analysis) => `
      <article class="analysis-card">
        <h3>${analysis.title}</h3>
        <p>${analysis.description}</p>
        <code>${analysis.path}</code>
      </article>
    `,
  ).join("");
}

function renderTradeoffs() {
  const container = document.querySelector("#tradeoff-list");
  container.innerHTML = tradeoffs.map(
    (item) => `
      <article class="tradeoff-card">
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </article>
    `,
  ).join("");
}

function renderCommands() {
  const container = document.querySelector("#command-grid");
  container.innerHTML = commands.map(
    (item) => `
      <article class="command-card">
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <code>${item.command}</code>
        <button class="copy-button" data-command="${item.command}">Copiar comando</button>
      </article>
    `,
  ).join("");
}

function stripAccents(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function canonicalUrgency(value) {
  const aliases = {
    BAIXA: "BAIXA",
    LOW: "BAIXA",
    MEDIA: "MÉDIA",
    "MÉDIA": "MÉDIA",
    MEDIUM: "MÉDIA",
    ALTA: "ALTA",
    HIGH: "ALTA",
    CRITICA: "CRÍTICA",
    "CRÍTICA": "CRÍTICA",
    CRITICAL: "CRÍTICA",
  };
  return aliases[stripAccents(value.trim()).toUpperCase()] ?? value;
}

function parseArrival(value) {
  if (value.includes("T")) {
    const parsed = new Date(value);
    return parsed.getHours() * 60 + parsed.getMinutes();
  }
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function adjustedPriority(patient) {
  const urgency = canonicalUrgency(patient.urgency);
  let priority = URGENCY_PRIORITY[urgency];
  if (patient.age >= 60 && priority === URGENCY_PRIORITY["MÉDIA"]) {
    priority = URGENCY_PRIORITY.ALTA;
  }
  if (patient.age < 18) {
    priority = Math.min(priority + 1, URGENCY_PRIORITY["CRÍTICA"]);
  }
  return priority;
}

function adjustedUrgency(patient) {
  return PRIORITY_URGENCY[adjustedPriority(patient)];
}

function orderQueue(patients) {
  return patients
    .map((patient, index) => ({
      index,
      patient,
      canonicalUrgency: canonicalUrgency(patient.urgency),
      adjustedPriority: adjustedPriority(patient),
      adjustedUrgency: adjustedUrgency(patient),
      arrivalValue: parseArrival(patient.arrival),
    }))
    .sort((left, right) => (
      right.adjustedPriority - left.adjustedPriority
      || left.arrivalValue - right.arrivalValue
      || left.index - right.index
    ));
}

function renderCaseTabs() {
  const container = document.querySelector("#case-tab-row");
  container.innerHTML = explorerCases.map((scenario) => `
      <button class="case-tab ${scenario.id === selectedCaseId ? "active" : ""}" data-case-id="${scenario.id}">
        ${scenario.label}
      </button>
    `).join("");
}

function renderRowsTable(headers, rows) {
  return `
    <table class="mini-table">
      <thead>
        <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderCaseOutput() {
  const scenario = explorerCases.find((item) => item.id === selectedCaseId) ?? explorerCases[0];
  const ordered = orderQueue(scenario.patients);
  const actualOrder = ordered.map((entry) => entry.patient.name);
  const container = document.querySelector("#case-output");

  const inputRows = scenario.patients.map((patient, index) => [
    index + 1,
    patient.name,
    patient.age,
    canonicalUrgency(patient.urgency),
    adjustedUrgency(patient),
    patient.arrival.includes("T") ? patient.arrival.slice(11, 16) : patient.arrival,
  ]);

  let validationMarkup = "";
  if (scenario.expectedOrder) {
    const ok = scenario.expectedOrder.join("|") === actualOrder.join("|");
    validationMarkup = `
      <div class="output-card">
        <h4>Validação</h4>
        ${renderRowsTable(
          ["Aspecto", "Esperado", "Obtido", "Status"],
          [[
            "ordem final",
            scenario.expectedOrder.join(" > "),
            actualOrder.join(" > "),
            ok ? "OK" : "FAIL",
          ]],
        )}
      </div>
    `;
  } else {
    const rows = Object.entries(scenario.expectedAdjustments).map(([name, expected]) => {
      const patient = scenario.patients.find((item) => item.name === name);
      const actual = adjustedUrgency(patient);
      return [name, expected, actual, expected === actual ? "OK" : "FAIL"];
    });
    validationMarkup = `
      <div class="output-card">
        <h4>Validação</h4>
        ${renderRowsTable(["Nome", "Esperado", "Obtido", "Status"], rows)}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="output-card">
      <h4>${scenario.title}</h4>
      <p>${scenario.focus}</p>
    </div>

    <div class="output-card">
      <h4>Entrada</h4>
      ${renderRowsTable(["#", "Nome", "Idade", "Declarada", "Final", "Chegada"], inputRows)}
    </div>

    <div class="output-card">
      <h4>Resultado calculado</h4>
      ${renderRowsTable(
        ["#", "Nome", "Declarada", "Final", "Chegada"],
        ordered.map((entry, index) => [
          index + 1,
          entry.patient.name,
          entry.canonicalUrgency,
          entry.adjustedUrgency,
          entry.patient.arrival.includes("T") ? entry.patient.arrival.slice(11, 16) : entry.patient.arrival,
        ]),
      )}
    </div>

    ${validationMarkup}

    <div class="callout">
      A vitrine mostra o comportamento do algoritmo de forma visual. A validação formal e a paridade
      Python × SQL continuam documentadas e executáveis no terminal.
    </div>
  `;
}

function buildSyntheticPatients(count) {
  const urgencies = ["BAIXA", "MÉDIA", "ALTA", "CRÍTICA"];
  const ages = [10, 17, 18, 30, 59, 60, 75];
  return Array.from({ length: count }, (_, index) => ({
    name: `Paciente ${String(index).padStart(5, "0")}`,
    age: ages[index % ages.length],
    urgency: urgencies[index % urgencies.length],
    arrival: `${String(7 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
  }));
}

function measure(label, fn) {
  const start = performance.now();
  fn();
  return { label, ms: performance.now() - start };
}

function createBucketQueue() {
  const buckets = { 4: [], 3: [], 2: [], 1: [] };
  return {
    enqueue(patient) {
      buckets[adjustedPriority(patient)].push(patient);
    },
    dequeueNext() {
      for (const priority of [4, 3, 2, 1]) {
        if (buckets[priority].length > 0) {
          return buckets[priority].shift();
        }
      }
      return null;
    },
  };
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60_000).toFixed(2)} min`;
}

function classifyDuration(ms) {
  if (ms < 1000) return "adequado";
  if (ms < 10_000) return "aceitável";
  if (ms < 60_000) return "atenção";
  return "fraco";
}

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function complexityUnits(count) {
  if (count <= 1) return 1;
  return (count ** 2) * Math.log2(count);
}

function estimateNaiveDurationMs(elapsedMs, processed, total) {
  const safeProcessed = Math.max(processed, 2);
  return elapsedMs * (complexityUnits(total) / complexityUnits(safeProcessed));
}

function renderVolumePending(count) {
  renderVolumeLoading({
    count,
    stageLabel: "Pronto para medir",
    progressPct: 0,
    processed: 0,
    elapsedMs: 0,
    note: "solte o slider para iniciar; se mover de novo, a execução anterior é descartada",
    sourceLabel: count > BROWSER_VOLUME_LIMIT ? "API local em espera" : "navegador em espera",
  });
}

function renderVolumeError(title, message) {
  const container = document.querySelector("#volume-output");
  container.innerHTML = `
    <div class="output-card">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `;
}

function renderVolumeLoading({
  count,
  stageLabel,
  progressPct,
  processed,
  elapsedMs,
  note,
  sourceLabel,
}) {
  const container = document.querySelector("#volume-output");
  container.innerHTML = `
    <div class="output-card">
      <h4>Execução em andamento</h4>
      <div class="progress-shell">
        <div class="progress-meta">
          <span>${stageLabel}</span>
          <span>${Math.round(progressPct)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPct}%"></div>
        </div>
      </div>
    </div>

    <div class="output-card">
      <h4>Status</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span>Entrada</span>
          <strong>${count} pacientes sintéticos</strong>
        </div>
        <div class="stat-item">
          <span>Processado no estágio atual</span>
          <strong>${processed}</strong>
        </div>
        <div class="stat-item">
          <span>Tempo consumido</span>
          <strong>${formatDuration(elapsedMs)}</strong>
        </div>
        <div class="stat-item">
          <span>Estratégia visual</span>
          <strong>${note}</strong>
        </div>
        <div class="stat-item">
          <span>Execução</span>
          <strong>${sourceLabel}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderVolumeResults({ count, metrics, budgetHit, processed, sourceLabel }) {
  const [batch, bucket, consume, naive] = metrics;
  const container = document.querySelector("#volume-output");
  const bestContinuous = bucket.ms < naive.ms ? "fila incremental" : "lote ainda competitivo";

  container.innerHTML = `
    <div class="metric-grid">
      ${metrics.map((item) => `
        <article class="metric-card">
          <span>${item.label}</span>
          <strong>${formatDuration(item.ms)}</strong>
          <span>${item.mode} · ${classifyDuration(item.ms)}</span>
        </article>
      `).join("")}
    </div>

    <div class="output-card">
      <h4>Leitura</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span>Entrada</span>
          <strong>${count} pacientes sintéticos</strong>
        </div>
        <div class="stat-item">
          <span>Melhor resultado para fluxo contínuo</span>
          <strong>${bestContinuous}</strong>
        </div>
        <div class="stat-item">
          <span>Contínuo ingênuo</span>
          <strong>${budgetHit ? `estimado após ${processed} chegadas` : "medido até o fim"}</strong>
        </div>
        <div class="stat-item">
          <span>Orçamento</span>
          <strong>${budgetHit ? "atingido; restante extrapolado" : "não atingido"}</strong>
        </div>
        <div class="stat-item">
          <span>Execução</span>
          <strong>${sourceLabel}</strong>
        </div>
      </div>
    </div>

    <div class="callout">
      <span class="status-chip">${budgetHit ? "modo híbrido" : "modo exato"}</span>
      ${budgetHit
        ? " A simulação mediu o que cabia no orçamento e estimou o restante para manter a experiência fluida."
        : " A simulação conseguiu medir tudo sem precisar cortar a execução."}
    </div>
  `;
}

async function runLocalVolumeSimulation(count, token) {
  const patients = buildSyntheticPatients(count);
  renderVolumeLoading({
    count,
    stageLabel: "Preparando lote sintético",
    progressPct: 5,
    processed: 0,
    elapsedMs: 0,
    note: "até 2.000 pacientes a simulação roda inteiramente no navegador",
    sourceLabel: "navegador (até 2.000)",
  });
  await nextFrame();
  if (token !== volumeRunToken) return;

  const batch = measure("batch sort", () => orderQueue(patients));
  batch.mode = "medido";
  renderVolumeLoading({
    count,
    stageLabel: "Medição 1/4 · batch sort",
    progressPct: 25,
    processed: count,
    elapsedMs: batch.ms,
    note: "medição exata concluída",
    sourceLabel: "navegador (até 2.000)",
  });
  await nextFrame();
  if (token !== volumeRunToken) return;

  const bucket = measure("bucket enqueue", () => {
    const queue = createBucketQueue();
    patients.forEach((patient) => queue.enqueue(patient));
  });
  bucket.mode = "medido";
  renderVolumeLoading({
    count,
    stageLabel: "Medição 2/4 · bucket enqueue",
    progressPct: 45,
    processed: count,
    elapsedMs: batch.ms + bucket.ms,
    note: "medição exata concluída",
    sourceLabel: "navegador (até 2.000)",
  });
  await nextFrame();
  if (token !== volumeRunToken) return;

  const consume = measure("bucket consume", () => {
    const queue = createBucketQueue();
    patients.forEach((patient) => queue.enqueue(patient));
    while (queue.dequeueNext()) {
      continue;
    }
  });
  consume.mode = "medido";
  renderVolumeLoading({
    count,
    stageLabel: "Medição 3/4 · bucket consume",
    progressPct: 60,
    processed: count,
    elapsedMs: batch.ms + bucket.ms + consume.ms,
    note: "medição exata concluída",
    sourceLabel: "navegador (até 2.000)",
  });
  await nextFrame();
  if (token !== volumeRunToken) return;

  const current = [];
  const naiveStart = performance.now();
  let processed = 0;
  let budgetHit = false;

  while (processed < count) {
    const sliceStart = performance.now();
    while (
      processed < count
      && performance.now() - sliceStart < VOLUME_FRAME_BUDGET_MS
      && performance.now() - naiveStart < VOLUME_SIMULATION_BUDGET_MS
    ) {
      current.push(patients[processed]);
      orderQueue(current);
      processed += 1;
    }

    const elapsedNaiveMs = performance.now() - naiveStart;
    renderVolumeLoading({
      count,
      stageLabel: "Medição 4/4 · cenário contínuo ingênuo",
      progressPct: 60 + 40 * Math.min(processed / count, 1),
      processed,
      elapsedMs: elapsedNaiveMs,
      note: elapsedNaiveMs >= VOLUME_SIMULATION_BUDGET_MS
        ? "orçamento do navegador atingido; finalizando em modo híbrido"
        : "executando em blocos para não travar a UI",
      sourceLabel: "navegador (até 2.000)",
    });
    if (token !== volumeRunToken) return;
    if (processed >= count) break;
    if (elapsedNaiveMs >= VOLUME_SIMULATION_BUDGET_MS) {
      budgetHit = true;
      break;
    }
    await nextFrame();
  }

  const naiveElapsedMs = performance.now() - naiveStart;
  const naive = {
    label: "contínuo ingênuo",
    ms: budgetHit
      ? estimateNaiveDurationMs(naiveElapsedMs, processed, count)
      : naiveElapsedMs,
    mode: budgetHit ? "estimado" : "medido",
  };

  renderVolumeResults({
    count,
    metrics: [batch, bucket, consume, naive],
    budgetHit,
    processed,
    sourceLabel: "navegador (até 2.000)",
  });
}

async function createRemoteVolumeJob(count) {
  const response = await fetch("/api/triage-simulations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  if (!response.ok) {
    throw new Error("create job failed");
  }
  return response.json();
}

async function fetchRemoteVolumeJob(jobId) {
  const response = await fetch(`/api/triage-simulations/${jobId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("fetch job failed");
  }
  return response.json();
}

async function cancelRemoteVolumeJob(jobId) {
  try {
    await fetch(`/api/triage-simulations/${jobId}/cancel`, { method: "POST" });
  } catch {
    // Best-effort cancel; stale jobs are also ignored by token.
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function abortActiveVolumeRun() {
  volumeRunToken += 1;
  window.clearTimeout(volumeDebounceHandle);
  if (activeVolumeJobId) {
    void cancelRemoteVolumeJob(activeVolumeJobId);
    activeVolumeJobId = null;
  }
  return volumeRunToken;
}

async function runRemoteVolumeSimulation(count, token) {
  renderVolumeLoading({
    count,
    stageLabel: "Enfileirando job na API local",
    progressPct: 2,
    processed: 0,
    elapsedMs: 0,
    note: "acima de 2.000 pacientes, a simulação sai do navegador e vai para o backend local",
    sourceLabel: "API local em background",
  });

  try {
    const created = await createRemoteVolumeJob(count);
    if (token !== volumeRunToken) return;
    activeVolumeJobId = created.job_id;

    while (token === volumeRunToken && activeVolumeJobId) {
      const job = await fetchRemoteVolumeJob(activeVolumeJobId);
      if (token !== volumeRunToken) return;

      if (job.status === "done") {
        activeVolumeJobId = null;
        renderVolumeResults({
          count,
          metrics: job.metrics,
          budgetHit: job.budget_hit,
          processed: job.processed,
          sourceLabel: "API local em background",
        });
        return;
      }

      if (job.status === "error") {
        activeVolumeJobId = null;
        renderVolumeError(
          "Falha na simulação em background",
          job.error || "A API local não conseguiu concluir o job.",
        );
        return;
      }

      if (job.status === "cancelled") {
        activeVolumeJobId = null;
        renderVolumePending(count);
        return;
      }

      renderVolumeLoading({
        count,
        stageLabel: job.stage_label,
        progressPct: job.progress_pct,
        processed: job.processed,
        elapsedMs: job.elapsed_ms,
        note: job.note,
        sourceLabel: "API local em background",
      });
      await sleep(VOLUME_API_POLL_MS);
    }
  } catch {
    if (token !== volumeRunToken) return;
    activeVolumeJobId = null;
    renderVolumeError(
      "API local indisponível",
      "Para volumes acima de 2.000, inicie a vitrine com `bash scripts/kata.sh showcase serve` ou `python3 showcase/server.py`.",
    );
  }
}

function scheduleVolumeSimulation(count, token) {
  window.clearTimeout(volumeDebounceHandle);
  volumeDebounceHandle = window.setTimeout(() => {
    if (count > VOLUME_API_LIMIT) {
      renderVolumeError(
        "Volume acima do limite da vitrine",
        `A UI aceita até ${VOLUME_API_LIMIT.toLocaleString("pt-BR")} pacientes. Para mais do que isso, use \`bash scripts/kata.sh kata1 explore\`.`,
      );
      return;
    }

    if (count <= BROWSER_VOLUME_LIMIT) {
      void runLocalVolumeSimulation(count, token);
      return;
    }

    void runRemoteVolumeSimulation(count, token);
  }, VOLUME_DEBOUNCE_MS);
}

function setupExplorer() {
  renderCaseTabs();
  renderCaseOutput();

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-case-id]");
    if (!target) return;
    selectedCaseId = target.getAttribute("data-case-id");
    renderCaseTabs();
    renderCaseOutput();
  });

  const range = document.querySelector("#volume-range");
  const value = document.querySelector("#volume-value");

  const syncValueOnly = () => {
    value.textContent = range.value;
    abortActiveVolumeRun();
    renderVolumePending(Number(range.value));
  };

  const triggerSimulation = () => {
    const token = volumeRunToken;
    scheduleVolumeSimulation(Number(range.value), token);
  };

  range.addEventListener("input", syncValueOnly);
  range.addEventListener("change", triggerSimulation);
  syncValueOnly();
  triggerSimulation();
}

function wireCopyButtons() {
  document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-command]");
    if (!target) return;

    const command = target.getAttribute("data-command");
    if (!command) return;

    try {
      await navigator.clipboard.writeText(command);
      const previous = target.textContent;
      target.textContent = "Copiado";
      window.setTimeout(() => {
        target.textContent = previous;
      }, 1200);
    } catch {
      target.textContent = "Copie manualmente";
    }
  });
}

renderModes();
renderKatas();
renderAnalyses();
renderTradeoffs();
renderCommands();
setupExplorer();
wireCopyButtons();
