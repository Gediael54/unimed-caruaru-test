function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function getRouteFromHash() {
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) return "overview";
  return ROUTES.some((route) => route.id === raw) ? raw : "overview";
}

const state = {
  route: getRouteFromHash(),
  health: null,
  commands: [],
  commandsLoaded: false,
  commandsLoading: false,
  commandsError: "",
  docs: [],
  docsLoaded: false,
  docsLoading: false,
  docsError: "",
  activeDocId: "",
  docCache: {},
  docLoading: {},
  docRequests: {},
  docErrors: {},
  activeRunId: "",
  activeRun: null,
  accessProbes: {},
};

const FRONTEND_LINK_LABEL = "Abrir frontend";

function isFrontendLink(link) {
  return Boolean(link) && link.label === FRONTEND_LINK_LABEL;
}

let runPollHandle = 0;
let accessProbeHandle = 0;
let pendingRouteDirection = 1;
let pendingDocDirection = 1;
let selectedCaseId = explorerCases[0].id;
let volumeCount = 2_000;
let volumeRunToken = 0;
let volumeDebounceHandle = 0;
let activeVolumeJobId = null;
let suppressNextHashRender = false;
let executionFocusHandle = 0;
let volumeFocusHandle = 0;

function setRoute(route, options = {}) {
  const nextHash = route === "overview" ? "#overview" : `#${route}`;
  if (state.route === route && window.location.hash === nextHash) {
    renderApp({
      animatePage: options.animatePage !== false,
      animateDoc: options.animateDoc !== false,
    });
    return;
  }
  const currentIndex = ROUTES.findIndex((item) => item.id === state.route);
  const nextIndex = ROUTES.findIndex((item) => item.id === route);
  pendingRouteDirection = nextIndex >= currentIndex ? 1 : -1;
  state.route = route;
  if (window.location.hash !== nextHash) {
    suppressNextHashRender = true;
    window.location.hash = nextHash;
  }
  renderApp({
    animatePage: options.animatePage !== false,
    animateDoc: options.animateDoc !== false,
  });
  if (options.scroll !== false) {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeCopyValue(value) {
  return window.btoa(
    encodeURIComponent(String(value)).replace(/%([0-9A-F]{2})/g, (_, hex) => (
      String.fromCharCode(Number.parseInt(hex, 16))
    )),
  );
}

function decodeCopyValue(value) {
  const binary = window.atob(String(value));
  const encoded = Array.from(binary, (char) => (
    `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`
  )).join("");
  return decodeURIComponent(encoded);
}

function buildCopyDataAttributes(value) {
  const text = String(value ?? "");
  if (text.includes("\n")) {
    return `data-copy-base64="${escapeHtml(encodeCopyValue(text))}"`;
  }
  return `data-copy="${escapeHtml(text)}"`;
}

function formatDuration(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60_000).toFixed(2)} min`;
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("pt-BR", {
    year: "numeric",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
}

function isFinalRunStatus(status) {
  return ["done", "error", "cancelled"].includes(status);
}

function isLiveRunStatus(status) {
  return ["preparing", "queued", "starting", "running", "finishing", "cancel_requested"].includes(status);
}

function runStatusLabel(status) {
  const labels = {
    preparing: "Preparando",
    queued: "Na fila",
    starting: "Iniciando",
    running: "Executando",
    finishing: "Finalizando",
    cancel_requested: "Cancelando",
    done: "Concluído",
    error: "Falhou",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
}

function runStatusTone(status) {
  const tones = {
    preparing: "tone-live",
    queued: "tone-warn",
    starting: "tone-live",
    running: "tone-live",
    finishing: "tone-live",
    cancel_requested: "tone-warn",
    done: "tone-ok",
    error: "tone-bad",
    cancelled: "tone-muted",
  };
  return tones[status] ?? "tone-muted";
}

function getCommand(commandId) {
  return state.commands.find((command) => command.id === commandId) ?? null;
}

function getCommandsByIds(commandIds) {
  return commandIds
    .map((commandId) => getCommand(commandId))
    .filter(Boolean);
}

function getDoc(docId) {
  return state.docs.find((doc) => doc.id === docId) ?? null;
}

function getDocsByIds(docIds) {
  return (docIds ?? [])
    .map((docId) => getDoc(docId))
    .filter(Boolean);
}

function getDocOrder(docId) {
  return state.docs.findIndex((doc) => doc.id === docId);
}

function focusDocViewer() {
  const viewer = document.querySelector("[data-doc-viewer='true']");
  if (!viewer) return;
  viewer.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

function focusExecutionArea(options = {}) {
  const panel = document.querySelector("[data-execution-focus='true']");
  if (!panel) return;
  panel.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  if (options.pulse === false) return;
  panel.classList.remove("execution-focus-live");
  void panel.offsetWidth;
  panel.classList.add("execution-focus-live");
  window.clearTimeout(executionFocusHandle);
  executionFocusHandle = window.setTimeout(() => {
    panel.classList.remove("execution-focus-live");
  }, 1400);
}

function focusVolumeArea(options = {}) {
  const panel = document.querySelector("[data-volume-focus='true']");
  if (!panel) return;
  panel.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  if (options.pulse === false) return;
  panel.classList.remove("volume-focus-live");
  void panel.offsetWidth;
  panel.classList.add("volume-focus-live");
  window.clearTimeout(volumeFocusHandle);
  volumeFocusHandle = window.setTimeout(() => {
    panel.classList.remove("volume-focus-live");
  }, 1400);
}

function buildPreparingRun(command) {
  const now = new Date().toISOString();
  return {
    run_id: "",
    command_id: command.id,
    scope: command.scope,
    title: command.title,
    runner_command: command.runner_command,
    manual_command: command.manual_command,
    status: "preparing",
    stage_label: "Preparando navegação e pedido",
    created_at: now,
    updated_at: now,
    started_at: null,
    finished_at: null,
    completed_at: null,
    duration_ms: 0,
    exit_code: null,
    timed_out: false,
    cancelled: false,
    is_running: false,
    can_cancel: false,
    output_complete: false,
    output: "",
    output_format: "plain",
    output_truncated: false,
    output_char_count: 0,
    output_line_count: 0,
    note: "A UI está abrindo a área de execução e pedindo um job real para a API local.",
    pid: null,
  };
}

function inferRunProgress(run) {
  if (!run) return { value: 0, indeterminate: false };
  if (typeof run.progress_pct === "number") {
    return {
      value: Math.max(0, Math.min(run.progress_pct, 100)),
      indeterminate: false,
    };
  }

  const byStatus = {
    preparing: 8,
    queued: 16,
    starting: 28,
    running: run.output_line_count > 0 ? 72 : 52,
    finishing: 90,
    cancel_requested: 68,
    done: 100,
    error: 100,
    cancelled: 100,
  };
  const value = byStatus[run.status] ?? 0;
  return {
    value,
    indeterminate: isLiveRunStatus(run.status),
  };
}

function getMatchedCatalogCommands(blockText) {
  const normalizedLines = blockText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (normalizedLines.length === 0) return [];

  return state.commands.filter((command) => (
    normalizedLines.includes(command.runner_command)
    || normalizedLines.includes(command.manual_command)
  ));
}

function stopRunPolling() {
  window.clearTimeout(runPollHandle);
  runPollHandle = 0;
}

function scheduleRunPolling() {
  stopRunPolling();
  if (!state.activeRunId || !state.activeRun || isFinalRunStatus(state.activeRun.status)) {
    stopAccessProbing();
    return;
  }
  runPollHandle = window.setTimeout(() => {
    void refreshActiveRun();
  }, 900);
  scheduleAccessProbing();
}

function stopAccessProbing() {
  window.clearTimeout(accessProbeHandle);
  accessProbeHandle = 0;
}

async function probeAccessLink(url) {
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store" });
    state.accessProbes[url] = { ready: true, lastCheck: Date.now() };
  } catch {
    state.accessProbes[url] = { ready: false, lastCheck: Date.now() };
  }
}

function scheduleAccessProbing() {
  stopAccessProbing();
  const links = state.activeRun?.access_links ?? [];
  if (!Array.isArray(links) || links.length === 0) return;
  if (!isLiveRunStatus(state.activeRun?.status)) return;

  const targets = links.filter(isFrontendLink);
  if (targets.length === 0) return;

  const runUrls = targets.map((link) => link.url);
  Promise.all(runUrls.map(probeAccessLink))
    .then(() => {
      refreshExecutionRegion({ focus: false, pulse: false });
      if (isLiveRunStatus(state.activeRun?.status)) {
        accessProbeHandle = window.setTimeout(scheduleAccessProbing, 1500);
      }
    });
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) throw new Error("health failed");
    state.health = await response.json();
  } catch {
    state.health = { ok: false, showcase: "offline", commands: 0 };
  }
  renderHeaderMeta();
}

async function loadCommands() {
  if (state.commandsLoaded || state.commandsLoading) return;
  state.commandsLoading = true;
  try {
    const response = await fetch("/api/commands", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog failed");
    const payload = await response.json();
    state.commands = payload.commands ?? [];
    state.commandsLoaded = true;
    state.commandsError = "";
  } catch {
    state.commandsLoaded = true;
    state.commandsError = "Não foi possível carregar o catálogo de comandos do showcase.";
  } finally {
    state.commandsLoading = false;
    renderApp({ animatePage: false, animateDoc: false });
    renderHeaderMeta();
  }
}

async function loadDocs() {
  if (state.docsLoaded || state.docsLoading) return;
  state.docsLoading = true;
  try {
    const response = await fetch("/api/docs", { cache: "no-store" });
    if (!response.ok) throw new Error("docs failed");
    const payload = await response.json();
    state.docs = payload.docs ?? [];
    state.docsLoaded = true;
    state.docsError = "";
  } catch {
    state.docsLoaded = true;
    state.docsError = "Não foi possível carregar o catálogo de documentos do showcase.";
  } finally {
    state.docsLoading = false;
    renderApp({ animatePage: false, animateDoc: false });
  }
}

async function ensureDocContent(docId, options = {}) {
  if (!docId) return null;
  if (options.force) {
    delete state.docCache[docId];
    delete state.docErrors[docId];
  }
  if (state.docCache[docId]) return state.docCache[docId];
  if (state.docRequests[docId]) return state.docRequests[docId];

  state.docLoading[docId] = true;
  delete state.docErrors[docId];

  const request = (async () => {
    try {
      const response = await fetch(`/api/docs/${docId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "doc failed");
      state.docCache[docId] = payload;
      return payload;
    } catch {
      state.docErrors[docId] = {
        message: "Não foi possível carregar este documento pelo showcase.",
        hint: "Garanta que o servidor local do showcase esteja ativo pelo runner oficial e tente de novo.",
      };
      return null;
    } finally {
      delete state.docLoading[docId];
      delete state.docRequests[docId];
      renderApp({ animatePage: false, animateDoc: false });
    }
  })();

  state.docRequests[docId] = request;
  renderApp({ animatePage: false, animateDoc: false, syncData: false });
  return request;
}

async function openDoc(docId, route = "docs", options = {}) {
  if (!docId) return;
  const currentIndex = getDocOrder(state.activeDocId);
  const nextIndex = getDocOrder(docId);
  const isRouteChange = Boolean(route && route !== state.route);
  pendingDocDirection = nextIndex >= currentIndex ? 1 : -1;
  state.activeDocId = docId;
  if (route) {
    setRoute(route, {
      scroll: false,
      animatePage: isRouteChange,
      animateDoc: false,
    });
  } else {
    renderApp({ animatePage: false, animateDoc: false });
  }
  await ensureDocContent(docId, { force: Boolean(options.force) });
  window.requestAnimationFrame(() => {
    focusDocViewer();
  });
}

function refreshExecutionRegion(options = {}) {
  const host = document.querySelector("[data-run-console-host='true']");
  if (!host) {
    if (state.route === "execucao") {
      renderApp({ animatePage: options.animatePage !== false });
    }
    return;
  }

  host.innerHTML = renderRunConsole();
  if (options.focus) {
    window.requestAnimationFrame(() => {
      focusExecutionArea({ pulse: options.pulse !== false });
    });
  }
}

async function startCommandRun(commandId) {
  const command = getCommand(commandId);
  if (!command || !command.runnable) return;

  stopRunPolling();
  stopAccessProbing();
  state.accessProbes = {};
  state.activeRunId = "";
  state.activeRun = buildPreparingRun(command);
  setRoute("execucao", { scroll: false });
  refreshExecutionRegion({ focus: true, pulse: true });

  try {
    const response = await fetch("/api/command-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command_id: commandId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      state.activeRun = {
        ...state.activeRun,
        status: "error",
        stage_label: "Falha ao criar o job",
        output_complete: true,
        note: payload.error || "Falha ao criar a execução.",
        output: payload.error || "Falha ao criar a execução.",
      };
      refreshExecutionRegion({ focus: true });
      return;
    }

    state.activeRunId = payload.run_id;
    state.activeRun = payload.run ?? state.activeRun;
    refreshExecutionRegion({ focus: true });
    scheduleRunPolling();
    await refreshActiveRun();
  } catch {
    state.activeRun = {
      ...state.activeRun,
      status: "error",
      stage_label: "Falha na comunicação local",
      output_complete: true,
        note: "Falha ao falar com a API local do showcase.",
      output: "A API local do showcase não respondeu. Inicie o showcase pelo runner oficial.",
    };
    refreshExecutionRegion({ focus: true });
  }
}

async function refreshActiveRun() {
  if (!state.activeRunId) return;
  try {
    const response = await fetch(`/api/command-runs/${state.activeRunId}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      state.activeRun = {
        status: "error",
        title: "Execução indisponível",
        stage_label: "Execução indisponível",
        note: payload.error || "Não foi possível consultar a execução.",
        output: payload.error || "",
      };
      stopRunPolling();
      refreshExecutionRegion();
      return;
    }
    state.activeRun = payload;
    refreshExecutionRegion();
    scheduleRunPolling();
  } catch {
    state.activeRun = {
      ...state.activeRun,
      status: "error",
      stage_label: "Falha no polling",
      output_complete: true,
      note: "Falha ao atualizar o status da execução.",
      output: "A API local do showcase não respondeu durante o polling.",
    };
    stopRunPolling();
    refreshExecutionRegion();
  }
}

async function cancelActiveRun() {
  if (!state.activeRunId) return;
  state.activeRun = {
    ...state.activeRun,
    status: "cancel_requested",
    stage_label: "Cancelamento solicitado",
    note: "A UI pediu o cancelamento e está aguardando a confirmação da API local.",
  };
  refreshExecutionRegion();
  try {
    await fetch(`/api/command-runs/${state.activeRunId}/cancel`, { method: "POST" });
    await refreshActiveRun();
  } catch {
    state.activeRun = {
      ...state.activeRun,
      status: "error",
      stage_label: "Falha ao cancelar",
      output_complete: true,
      note: "Falha ao solicitar o cancelamento.",
      output: "Não foi possível solicitar o cancelamento da execução atual.",
    };
    refreshExecutionRegion();
  }
}
