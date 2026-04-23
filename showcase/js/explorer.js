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

function renderRowsTable(headers, rows) {
  return `
    <table class="mini-table">
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderCaseTabs() {
  const container = document.querySelector("#case-tab-row");
  if (!container) return;
  container.innerHTML = explorerCases.map((scenario) => `
      <button class="case-tab ${scenario.id === selectedCaseId ? "active" : ""}" data-case-id="${scenario.id}">
        ${escapeHtml(scenario.label)}
      </button>
    `).join("");
}

function renderCaseOutput() {
  const container = document.querySelector("#case-output");
  if (!container) return;

  const scenario = explorerCases.find((item) => item.id === selectedCaseId) ?? explorerCases[0];
  const ordered = orderQueue(scenario.patients);
  const actualOrder = ordered.map((entry) => entry.patient.name);

  const inputRows = scenario.patients.map((patient, index) => [
    String(index + 1),
    patient.name,
    String(patient.age),
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
      <h4>${escapeHtml(scenario.title)}</h4>
      <p>${escapeHtml(scenario.focus)}</p>
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
          String(index + 1),
          entry.patient.name,
          entry.canonicalUrgency,
          entry.adjustedUrgency,
          entry.patient.arrival.includes("T") ? entry.patient.arrival.slice(11, 16) : entry.patient.arrival,
        ]),
      )}
    </div>

    ${validationMarkup}
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

function renderVolumeError(title, message) {
  const container = document.querySelector("#volume-output");
  if (!container) return;
  container.innerHTML = `
    <div class="output-card">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(message)}</p>
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
  if (!container) return;
  container.innerHTML = `
    <div class="output-card">
      <h4>Execução em andamento</h4>
      <div class="progress-shell">
        <div class="progress-meta">
          <span>${escapeHtml(stageLabel)}</span>
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
          <strong>${count.toLocaleString("pt-BR")} pacientes sintéticos</strong>
        </div>
        <div class="stat-item">
          <span>Processado</span>
          <strong>${processed.toLocaleString("pt-BR")}</strong>
        </div>
        <div class="stat-item">
          <span>Tempo consumido</span>
          <strong>${formatDuration(elapsedMs)}</strong>
        </div>
        <div class="stat-item">
          <span>Leitura</span>
          <strong>${escapeHtml(note)}</strong>
        </div>
        <div class="stat-item">
          <span>Execução</span>
          <strong>${escapeHtml(sourceLabel)}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderVolumeResults({ count, metrics, budgetHit, processed, sourceLabel }) {
  const container = document.querySelector("#volume-output");
  if (!container) return;
  const [, bucket, , naive] = metrics;
  const bestContinuous = bucket.ms < naive.ms ? "fila incremental" : "lote ainda competitivo";

  container.innerHTML = `
    <div class="metric-grid">
      ${metrics.map((item) => `
        <article class="metric-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${formatDuration(item.ms)}</strong>
          <span>${escapeHtml(item.mode)} · ${escapeHtml(classifyDuration(item.ms))}</span>
        </article>
      `).join("")}
    </div>

    <div class="output-card">
      <h4>Leitura</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span>Entrada</span>
          <strong>${count.toLocaleString("pt-BR")} pacientes sintéticos</strong>
        </div>
        <div class="stat-item">
          <span>Melhor resultado contínuo</span>
          <strong>${escapeHtml(bestContinuous)}</strong>
        </div>
        <div class="stat-item">
          <span>Cenário ingênuo</span>
          <strong>${budgetHit ? `estimado após ${processed.toLocaleString("pt-BR")} chegadas` : "medido até o fim"}</strong>
        </div>
        <div class="stat-item">
          <span>Orçamento</span>
          <strong>${budgetHit ? "atingido; restante extrapolado" : "não atingido"}</strong>
        </div>
        <div class="stat-item">
          <span>Execução</span>
          <strong>${escapeHtml(sourceLabel)}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderVolumePending(count) {
  renderVolumeLoading({
    count,
    stageLabel: "Pronto para medir",
    progressPct: 0,
    processed: 0,
    elapsedMs: 0,
    note: "ajuste o slider para iniciar ou trocar a simulação",
    sourceLabel: count > BROWSER_VOLUME_LIMIT ? "API local em espera" : "navegador em espera",
  });
}

function syncVolumeControls(nextCount) {
  volumeCount = nextCount;
  const range = document.querySelector("#volume-range");
  const value = document.querySelector("#volume-value");
  if (range) range.value = String(nextCount);
  if (value) value.textContent = nextCount.toLocaleString("pt-BR");
  document.querySelectorAll("[data-volume-preset]").forEach((button) => {
    button.classList.toggle("active", Number(button.getAttribute("data-volume-preset")) === nextCount);
  });
}

function triggerVolumeSimulation(count) {
  const token = abortActiveVolumeRun();
  syncVolumeControls(count);
  renderVolumePending(count);
  focusVolumeArea({ pulse: true });
  scheduleVolumeSimulation(count, token);
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
    // best effort only
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
    note: "acima de 2.000 pacientes a medição sai do navegador e vai para a API local",
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
      "Para volumes acima de 2.000, use o runner oficial do showcase ou rode o servidor diretamente.",
    );
  }
}

function scheduleVolumeSimulation(count, token) {
  window.clearTimeout(volumeDebounceHandle);
  volumeDebounceHandle = window.setTimeout(() => {
    if (count > VOLUME_API_LIMIT) {
      renderVolumeError(
        "Volume acima do limite da vitrine",
        `A UI aceita até ${VOLUME_API_LIMIT.toLocaleString("pt-BR")} pacientes. Para mais do que isso, use o terminal.`,
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
  const range = document.querySelector("#volume-range");
  const value = document.querySelector("#volume-value");
  if (!range || !value || range.dataset.bound === "true") return;

  const syncValueOnly = () => {
    syncVolumeControls(Number(range.value));
    abortActiveVolumeRun();
    renderVolumePending(volumeCount);
  };

  const startFromRange = () => {
    triggerVolumeSimulation(Number(range.value));
  };

  range.dataset.bound = "true";
  range.addEventListener("input", syncValueOnly);
  range.addEventListener("change", startFromRange);
  document.querySelectorAll("[data-volume-preset]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      triggerVolumeSimulation(Number(button.getAttribute("data-volume-preset")));
    });
  });
  syncValueOnly();
  triggerVolumeSimulation(volumeCount);
}

async function copyText(text, target) {
  try {
    await navigator.clipboard.writeText(text);
    const previous = target.textContent;
    target.textContent = "Copiado";
    window.setTimeout(() => {
      target.textContent = previous;
    }, 1200);
  } catch {
    target.textContent = "Copie manualmente";
  }
}
