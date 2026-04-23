function renderHeaderMeta() {
  const container = document.querySelector("#header-meta");
  if (!container) return;

  const apiReady = Boolean(state.health?.ok);
  const commandCount = state.commandsLoaded ? state.commands.length : "…";
  const docCount = state.docsLoaded ? state.docs.length : "…";
  container.innerHTML = `
    <span class="panel-label">Status local</span>
    <strong>${apiReady ? "API do showcase ativa" : "Aguardando API local"}</strong>
    <div class="meta-pairs">
      <div class="meta-pair">
        <span>Health</span>
        <strong class="${apiReady ? "text-ok" : "text-warn"}">${apiReady ? "OK" : "offline"}</strong>
      </div>
      <div class="meta-pair">
        <span>Comandos permitidos</span>
        <strong>${commandCount}</strong>
      </div>
      <div class="meta-pair">
        <span>Docs no showcase</span>
        <strong>${docCount}</strong>
      </div>
      <div class="meta-pair">
        <span>Código-fonte</span>
        <strong>apenas no repositório</strong>
      </div>
    </div>
  `;
}

function renderCopyButton(label, value, variant = "secondary") {
  return `
    <button class="copy-button ${variant === "secondary" ? "secondary" : ""}" ${buildCopyDataAttributes(value)}>
      ${escapeHtml(label)}
    </button>
  `;
}

function renderNav() {
  const container = document.querySelector("#top-nav");
  if (!container) return;
  const runnerFamily = state.health?.runner_family === "cmd" ? "cmd" : "bash";
  const runnerCommand = state.health?.runner_help_command ?? "bash scripts/kata.sh";
  const showcaseCommand = state.health?.showcase_start_command ?? "bash scripts/kata.sh showcase serve";

  container.innerHTML = `
    <div class="nav-groups">
      ${NAV_GROUPS.map(
        (group) => `
          <section class="nav-group ${group.title === "Projeto" ? "nav-group-primary" : "nav-group-secondary"}">
            <div class="nav-group-head">
              <p class="overline">${group.title}</p>
              <p class="nav-group-text">
                ${group.title === "Projeto"
                  ? "Fluxo principal para entender, validar e ler a entrega."
                  : "Exploração técnica por kata, depois que o fluxo principal estiver coberto."}
              </p>
            </div>
            <div class="nav-group-links">
              ${group.routes.map((routeId) => {
                const route = ROUTES.find((item) => item.id === routeId);
                return `
                  <button class="nav-link ${routeId === state.route ? "active" : ""}" data-route="${routeId}">
                    <span class="nav-link-kicker">${PRIMARY_ROUTE_STEPS[routeId] ?? "Explorar"}</span>
                    <strong>${route.label}</strong>
                    <span>${escapeHtml(ROUTE_DESCRIPTIONS[routeId] ?? "")}</span>
                  </button>
                `;
              }).join("")}
            </div>
          </section>
        `,
      ).join("")}
    </div>
    <div class="nav-actions">
      <button class="copy-button secondary" data-copy="${escapeHtml(runnerCommand)}">Copiar runner ${runnerFamily}</button>
      <button class="copy-button secondary" data-copy="${escapeHtml(showcaseCommand)}">Copiar showcase ${runnerFamily}</button>
    </div>
  `;
}

function renderPill(text, tone = "") {
  return `<span class="state-pill ${tone}">${escapeHtml(text)}</span>`;
}

function renderFileList(items) {
  return `
    <div class="path-list">
      ${items.map(
        (item) => `
          <div class="path-item">
            <span>${escapeHtml(item.label ?? "Arquivo")}</span>
            <code>${escapeHtml(item.path ?? item)}</code>
          </div>
        `,
      ).join("")}
    </div>
  `;
}

function renderNotesList(items) {
  return `
    <ul class="checklist">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderActionButton(action) {
  const label = escapeHtml(action.label);
  switch (action.kind) {
    case "route":
      return `<button class="copy-button secondary" data-route="${escapeHtml(action.value)}">${label}</button>`;
    case "run":
      return `<button class="copy-button" data-run-command="${escapeHtml(action.value)}">${label}</button>`;
    case "doc":
      return `
        <button
          class="copy-button secondary"
          data-open-doc="${escapeHtml(action.value)}"
          data-open-doc-route="${escapeHtml(action.route ?? "docs")}"
        >
          ${label}
        </button>
      `;
    case "copy":
      return renderCopyButton(action.label, action.value);
    default:
      return "";
  }
}

function renderSpotlightCard({ eyebrow, title, text, actions = [], stats = [], tone = "" }) {
  return `
    <section class="surface spotlight-card ${tone}">
      <div class="spotlight-copy">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2>${escapeHtml(title)}</h2>
        <p class="section-text">${escapeHtml(text)}</p>
        ${actions.length > 0 ? `
          <div class="spotlight-actions">
            ${actions.map(renderActionButton).join("")}
          </div>
        ` : ""}
      </div>
      ${stats.length > 0 ? `
        <div class="spotlight-stats">
          ${stats.map((stat) => `
            <article class="spotlight-stat">
              <span>${escapeHtml(stat.label)}</span>
              <strong>${escapeHtml(String(stat.value))}</strong>
            </article>
          `).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function formatInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function parseTableRow(line) {
  const normalized = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return normalized.split("|").map((cell) => cell.trim());
}

function extractDocHeadings(content) {
  return content
    .split("\n")
    .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      level: match[1].length,
      text: match[2].trim(),
    }));
}

function normalizeFenceLanguage(rawLanguage = "") {
  const normalized = rawLanguage.trim().toLowerCase();
  const aliases = {
    shell: "bash",
    sh: "bash",
    console: "text",
    plaintext: "text",
    txt: "text",
  };
  return aliases[normalized] ?? normalized;
}

function classifyFenceBlock(language, content) {
  const normalized = normalizeFenceLanguage(language);
  if (normalized === "bash") {
    return {
      kind: "command",
      label: "Comando documental",
      caption: "Bloco de instrução e cópia. A execução real continua restrita ao catálogo da área Execução.",
    };
  }

  if (["csv", "json", "sql", "text"].includes(normalized)) {
    return {
      kind: normalized === "text" ? "example" : "data",
      label: normalized === "text" ? "Exemplo textual" : `Exemplo ${normalized.toUpperCase()}`,
      caption: "Exemplo de apoio à leitura, sem semântica de execução.",
    };
  }

  return {
    kind: "snippet",
    label: normalized ? `Bloco ${normalized}` : "Bloco técnico",
    caption: "Trecho documental preservado como referência visual.",
  };
}

function renderMarkdownLinkCallout(value) {
  return `
    <div class="markdown-callout">
      <div>
        <span class="markdown-block-label">Link</span>
        <p class="markdown-callout-text">${escapeHtml(value)}</p>
      </div>
      <a class="copy-button secondary" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">
        Abrir
      </a>
    </div>
  `;
}

function renderMarkdownFence(language, content) {
  const normalized = normalizeFenceLanguage(language);
  const trimmedContent = content.trim();
  if (normalized === "text" && /^https?:\/\/\S+$/i.test(trimmedContent)) {
    return renderMarkdownLinkCallout(trimmedContent);
  }

  const presentation = classifyFenceBlock(normalized, content);
  const matches = presentation.kind === "command" ? getMatchedCatalogCommands(content) : [];
  const copyTextValue = trimmedContent || content;

  return `
    <figure class="markdown-block markdown-block-${presentation.kind}">
      <figcaption class="markdown-block-head">
        <div class="markdown-block-copy">
          <span class="markdown-block-label">${escapeHtml(presentation.label)}</span>
          <p class="markdown-block-text">${escapeHtml(presentation.caption)}</p>
        </div>
        <div class="markdown-block-actions">
          ${matches.length > 0 ? `<span class="badge">Também no catálogo de execução</span>` : ""}
          ${copyTextValue ? renderCopyButton("Copiar", copyTextValue) : ""}
        </div>
      </figcaption>
      <pre class="markdown-code markdown-code-${presentation.kind}" data-fence-language="${escapeHtml(normalized || "plain")}"><code>${escapeHtml(content)}</code></pre>
    </figure>
  `;
}

function markdownToHtml(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const fenceMatch = trimmed.match(/^```([\w-]+)?/);
      const fenceLanguage = fenceMatch?.[1] ?? "";
      const block = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        block.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      html.push(renderMarkdownFence(fenceLanguage, block.join("\n")));
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6);
      html.push(`<h${level} class="markdown-h${level}">${formatInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (trimmed.includes("|") && index + 1 < lines.length && /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(lines[index + 1])) {
      const headers = parseTableRow(lines[index]);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }
      html.push(`
        <div class="markdown-table-wrap">
          <table class="markdown-table">
            <thead>
              <tr>${headers.map((cell) => `<th>${formatInlineMarkdown(cell)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map((row) => `<tr>${row.map((cell) => `<td>${formatInlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      `);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      html.push(`<ul class="markdown-list">${items.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol class="markdown-list">${items.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !lines[index].trim().startsWith("```")
      && !/^(#{1,6})\s+/.test(lines[index].trim())
      && !/^[-*]\s+/.test(lines[index].trim())
      && !/^\d+\.\s+/.test(lines[index].trim())
      && !(lines[index].includes("|") && index + 1 < lines.length && /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(lines[index + 1]))
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    html.push(`<p class="markdown-paragraph">${formatInlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return html.join("");
}

function renderDocEntryButtons(docIds, route = "docs") {
  if (state.docsLoading && state.docs.length === 0) {
    return `<div class="empty-state">Carregando catálogo de documentos do showcase…</div>`;
  }
  if (state.docsError) {
    return `<div class="empty-state">${escapeHtml(state.docsError)}</div>`;
  }

  const docs = getDocsByIds(docIds);
  if (docs.length === 0) {
    return `<div class="empty-state">Nenhuma documentação mapeada para esta seção.</div>`;
  }

  return `
    <div class="doc-button-grid">
      ${docs.map((doc) => `
        <button class="doc-link-card" data-open-doc="${doc.id}" data-open-doc-route="${route}">
          <strong>${escapeHtml(doc.title)}</strong>
          <span>${escapeHtml(doc.path)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderDocViewer(docId, options = {}) {
  if (state.docLoading[docId]) {
    return `
      <div class="doc-viewer empty-state doc-viewer-loading">
        <div class="terminal-placeholder">
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
          <p>Carregando documento no showcase…</p>
        </div>
      </div>
    `;
  }

  const doc = state.docCache[docId];
  const docMeta = getDoc(docId);
  const docError = state.docErrors[docId];
  if (docError) {
    const docTitle = docMeta ? docMeta.title : "Documento";
    return `
      <div class="doc-viewer empty-state doc-viewer-error">
        <p class="overline">${escapeHtml(docTitle)}</p>
        <p>${escapeHtml(docError.message)}</p>
        <p class="doc-error-hint">${escapeHtml(docError.hint)}</p>
        <button class="copy-button" data-retry-doc="${docId}" data-retry-doc-route="${options.route ?? "docs"}">
          Tentar de novo
        </button>
      </div>
    `;
  }
  if (!doc && docMeta) {
    if (state.activeDocId === docId) {
      return `
        <div class="doc-viewer empty-state doc-viewer-loading">
          <div class="terminal-placeholder">
            <span class="terminal-dot"></span>
            <span class="terminal-dot"></span>
            <span class="terminal-dot"></span>
            <p>Carregando documento no showcase…</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="doc-viewer empty-state">
        <p>Documento disponível no showcase, mas ainda não carregado.</p>
        <button class="copy-button secondary" data-open-doc="${docId}" data-open-doc-route="${options.route ?? "docs"}">
          Abrir documento
        </button>
      </div>
    `;
  }

  if (!doc) {
    return `<div class="doc-viewer empty-state">Documento não encontrado nesta vitrine.</div>`;
  }

  const headings = extractDocHeadings(doc.content).slice(0, 8);
  return `
    <div class="doc-viewer" data-doc-viewer="true" data-doc-id="${docId}">
      <div class="doc-viewer-head">
        <div>
          <p class="overline">Documentação</p>
          <h3>${escapeHtml(doc.title)}</h3>
          <p class="doc-meta">${escapeHtml(doc.path)}${doc.updated_at ? ` · atualizado em ${escapeHtml(formatTimestamp(doc.updated_at))} UTC` : ""}</p>
        </div>
        <div class="banner-actions">
          <button class="copy-button secondary" data-route="docs">Abrir central de docs</button>
        </div>
      </div>
      ${headings.length > 0 ? `
        <div class="doc-outline">
          ${headings.map((heading) => `<span class="badge outline-level-${heading.level}">${escapeHtml(heading.text)}</span>`).join("")}
        </div>
      ` : ""}
      <div class="markdown-body">
        ${markdownToHtml(doc.content)}
      </div>
    </div>
  `;
}

function renderCommandCards(commandIds, options = {}) {
  if (state.commandsLoading) {
    return `<div class="empty-state">Carregando catálogo de comandos do showcase…</div>`;
  }
  if (state.commandsError) {
    return `<div class="empty-state">${escapeHtml(state.commandsError)}</div>`;
  }

  const commands = getCommandsByIds(commandIds);
  if (commands.length === 0) {
    return `<div class="empty-state">Nenhum comando mapeado para esta seção.</div>`;
  }

  return `
    <div class="command-grid ${options.compact ? "compact-grid" : ""}">
      ${commands.map((command) => renderCommandCard(command, options)).join("")}
    </div>
  `;
}

function truncatePreview(value, maxLength = 96) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function summarizeCommandValue(value) {
  const lines = String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { preview: "—", meta: "", multiline: false };
  }

  const terminalLabels = lines.filter((line) => /^Terminal\s+\d+:$/i.test(line));
  const contentLines = lines.filter((line) => !/^Terminal\s+\d+:$/i.test(line));
  const previewSource = contentLines[0] ?? lines[0];

  let meta = "";
  if (terminalLabels.length > 0) {
    meta = `${terminalLabels.length} ${terminalLabels.length === 1 ? "terminal" : "terminais"}`;
  } else if (lines.length > 1) {
    meta = `${lines.length} linhas`;
  }

  return {
    preview: truncatePreview(previewSource),
    meta,
    multiline: lines.length > 1,
  };
}

function renderCommandReferenceBlock(label, value) {
  if (!value) return "";
  const summary = summarizeCommandValue(value);

  return `
    <article class="command-reference">
      <div class="command-reference-head">
        <span>${escapeHtml(label)}</span>
        ${summary.meta ? `<span class="command-reference-meta">${escapeHtml(summary.meta)}</span>` : ""}
        <button type="button" class="command-reference-copy" ${buildCopyDataAttributes(value)}>Copiar</button>
      </div>
      <code class="command-reference-inline command-reference-preview-code ${summary.multiline ? "is-multiline" : ""}">${escapeHtml(summary.preview)}</code>
    </article>
  `;
}

function renderCommandReferences(runnerCommand, manualCommand, options = {}) {
  const runner = runnerCommand ? escapeHtml(runnerCommand) : "";
  const manual = manualCommand ? escapeHtml(manualCommand) : "";
  const compact = Boolean(options.compact);

  if (!runner && !manual) {
    return "";
  }

  if (compact) {
    if (!manual || manual === runner) {
      return `
        <div class="command-reference-grid compact-list">
          ${renderCommandReferenceBlock("Comando", runnerCommand || manualCommand)}
        </div>
      `;
    }

    return `
      <div class="command-reference-grid compact-list">
        ${renderCommandReferenceBlock("Runner", runnerCommand)}
        ${renderCommandReferenceBlock("Manual", manualCommand)}
      </div>
    `;
  }

  if (!manual || manual === runner) {
    return `
      <div class="command-reference-grid compact-list">
        ${renderCommandReferenceBlock("Comando", runnerCommand || manualCommand)}
      </div>
    `;
  }

  return `
    <div class="command-reference-grid compact-list">
      ${renderCommandReferenceBlock("Runner", runnerCommand)}
      ${renderCommandReferenceBlock("Manual", manualCommand)}
    </div>
  `;
}

function renderCommandArtifacts(artifacts, options = {}) {
  if (artifacts.length === 0) {
    return "";
  }

  if (options.compact) {
    return `
      <div class="command-artifacts command-artifacts-compact">
        <span class="command-artifacts-label">Artefatos</span>
        <p class="command-artifacts-summary">${artifacts.length} ${artifacts.length === 1 ? "artefato" : "artefatos"}</p>
      </div>
    `;
  }

  return `
    <div class="command-artifacts">
      <span class="command-artifacts-label">Artefatos</span>
      <div class="badge-row">
        ${artifacts.map((artifact) => `<span class="badge">${escapeHtml(artifact)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderAccessLinkItem(link, options = {}) {
  const url = link.url;
  const isPrimary = isFrontendLink(link);
  const probe = state.accessProbes[url];
  const ready = Boolean(probe?.ready);
  const probing = Boolean(options.probing);
  const variant = isPrimary ? "primary" : "secondary";
  const disabled = isPrimary && !ready;
  const statusLabel = !isPrimary
    ? ""
    : ready
      ? "servidor pronto"
      : probing
        ? "aguardando servidor…"
        : "servidor indisponível";
  const statusTone = !isPrimary
    ? ""
    : ready
      ? "tone-ok"
      : probing
        ? "tone-live"
        : "tone-muted";
  const classes = [
    "copy-button",
    variant,
    "access-link",
    isPrimary ? "access-link-primary" : "",
    disabled ? "is-disabled" : "",
  ].filter(Boolean).join(" ");

  const anchor = disabled
    ? `<span class="${classes}" role="link" aria-disabled="true">${escapeHtml(link.label)}</span>`
    : `<a class="${classes}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`;

  return `
    <div class="access-link-group">
      ${anchor}
      ${statusLabel ? `<span class="badge ${statusTone}">${escapeHtml(statusLabel)}</span>` : ""}
    </div>
  `;
}

function renderAccessLinks(links, options = {}) {
  if (!Array.isArray(links) || links.length === 0) {
    return "";
  }

  return `
    <div class="command-access-links ${options.compact ? "command-access-links-compact" : ""}">
      <span class="command-artifacts-label">Acessos rápidos</span>
      <div class="command-actions access-link-row">
        ${links.map((link) => renderAccessLinkItem(link, options)).join("")}
      </div>
    </div>
  `;
}

function renderCommandCard(command, options = {}) {
  const artifacts = command.artifacts ?? [];
  const isCurrentRun = state.activeRun?.command_id === command.id;
  const isLiveRun = isCurrentRun && isLiveRunStatus(state.activeRun?.status);
  const compact = Boolean(options.compact);
  return `
    <article class="command-card ${compact ? "command-card-compact" : ""} ${isCurrentRun ? "command-card-live" : ""}">
      <div class="card-head">
        <div>
          <p class="overline">${escapeHtml(SCOPE_LABELS[command.scope] ?? command.scope)}</p>
          <h3>${escapeHtml(command.title)}</h3>
        </div>
        ${renderPill(
          isLiveRun ? "Em execução" : command.runnable ? (compact ? "Roda aqui" : "Executável aqui") : (compact ? "Só terminal" : "Somente terminal"),
          isLiveRun ? "tone-live" : command.runnable ? "tone-live" : "tone-muted",
        )}
      </div>
      <p class="card-text">${escapeHtml(command.description)}</p>
      ${renderCommandReferences(command.runner_command, command.manual_command, { compact })}
      ${renderCommandArtifacts(artifacts, { compact })}
      ${command.runnable ? `
        <div class="command-actions">
          <button class="copy-button" data-run-command="${command.id}">
            ${compact ? (isCurrentRun ? "Rodar de novo" : "Executar") : (isCurrentRun ? "Executar novamente" : "Executar no showcase")}
          </button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderOverviewPage() {
  const recommendedIds = state.commands
    .filter((command) => command.recommended)
    .map((command) => command.id);
  const kataCards = ROUTE_CARDS.filter((card) => card.route.startsWith("kata-"));
  const runnableCount = state.commands.filter((command) => command.runnable).length;
  const overviewSpotlight = renderSpotlightCard({
    eyebrow: "Comece Por Aqui",
    title: "Faça a revisão em três passos",
    text: "Use Visão Geral para entender a entrega, Execução para validar comandos reais e Docs para ler a argumentação. As páginas por kata ficam para aprofundamento.",
    actions: [
      { kind: "route", value: "execucao", label: "Abrir execução" },
      { kind: "route", value: "docs", label: "Abrir docs" },
      { kind: "route", value: "kata-2", label: "Ir para Kata 2" },
    ],
    stats: [
      { label: "Comandos mapeados", value: state.commandsLoaded ? state.commands.length : "…" },
      { label: "Executáveis aqui", value: state.commandsLoaded ? runnableCount : "…" },
      { label: "Docs internos", value: state.docsLoaded ? state.docs.length : "…" },
    ],
    tone: "spotlight-primary",
  });

  return `
    <section class="page-intro">
      <div class="section-heading">
        <p class="eyebrow">Portal do Projeto</p>
        <h2>Fluxo principal primeiro, exploração depois</h2>
        <p class="section-text">
          Esta vitrine foi reorganizada para um técnico conseguir revisar o projeto
          sem se perder: primeiro entender a entrega, depois validar comandos e
          documentação, e só então aprofundar por kata.
        </p>
      </div>
      <div class="review-flow-grid">
        ${REVIEW_FLOW.map((item) => `
          <article class="flow-step-card">
            <span class="flow-step-index">${escapeHtml(item.step)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
            <button class="copy-button secondary" data-route="${item.route}">Abrir etapa</button>
          </article>
        `).join("")}
      </div>
    </section>

    ${overviewSpotlight}

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Entradas Reais</p>
        <h2>Como navegar ou executar</h2>
      </div>
      <div class="mode-grid">
        ${MODE_CARDS.map(
          (mode) => `
            <article class="mode-card">
              <h3>${escapeHtml(mode.title)}</h3>
              <p>${escapeHtml(mode.text)}</p>
              <code>${escapeHtml(mode.command)}</code>
            </article>
          `,
        ).join("")}
      </div>
    </section>

    <section class="surface two-col-grid">
      <article class="stack-card">
        <div class="section-heading">
          <p class="eyebrow">Entrega</p>
          <h2>Leitura do repositório</h2>
        </div>
        <div class="card-stack">
          ${OVERVIEW_HIGHLIGHTS.map(
            (item) => `
              <article class="info-card">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.text)}</p>
              </article>
            `,
          ).join("")}
        </div>
      </article>
      <article class="stack-card">
        <div class="section-heading">
          <p class="eyebrow">Estrutura</p>
          <h2>Pontos de entrada reais</h2>
        </div>
        ${renderFileList(REPOSITORY_PATHS)}
      </article>
    </section>

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Decisão Arquitetural</p>
        <h2>Por que o showcase não virou um frontend em React</h2>
        <p class="section-text">
          O frontend em React foi mantido concentrado na Kata 2, que é a entrega full-stack avaliada.
          O showcase ficou como vitrine técnica do repositório para não competir com esse papel.
        </p>
      </div>
      <div class="two-col-grid">
        <article class="info-card">
          <h3>Escolha de escopo</h3>
          <p>
            Criar outro frontend React aqui adicionaria uma segunda aplicação web dentro do mesmo projeto,
            aumentando o risco de confundir o produto da Kata 2 com uma camada auxiliar de apresentação.
          </p>
        </article>
        <article class="info-card">
          <h3>Trade-off assumido</h3>
          <p>
            React daria mais ergonomia de componentização e testes de UI, mas HTML, CSS e JavaScript modular
            já cobrem o que a vitrine precisa: navegar, abrir docs, disparar comandos whitelist e mostrar retorno real.
          </p>
        </article>
      </div>
      <div class="banner-actions">
        <button class="copy-button secondary" data-open-doc="showcase-readme" data-open-doc-route="docs">
          Ler decisão completa
        </button>
        <button class="copy-button secondary" data-route="kata-2">
          Ir para o frontend real
        </button>
      </div>
    </section>

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Atalhos</p>
        <h2>Comandos recomendados</h2>
      </div>
      ${renderCommandCards(recommendedIds, { compact: true })}
    </section>

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Documentação</p>
        <h2>Markdowns acessíveis no showcase</h2>
        <p class="section-text">
          A vitrine mostra documentação e retorno de comandos. A leitura de código-fonte continua restrita ao repositório.
        </p>
      </div>
      ${renderDocEntryButtons(PRIMARY_DOC_IDS)}
    </section>

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Exploração Técnica</p>
        <h2>Páginas por kata</h2>
        <p class="section-text">
          Depois do fluxo principal, use estas páginas para revisar cada entrega em profundidade.
        </p>
      </div>
      <div class="route-grid">
        ${kataCards.map(
          (card) => `
            <article class="route-card">
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.text)}</p>
              <button class="copy-button secondary" data-route="${card.route}">Abrir página</button>
            </article>
          `,
        ).join("")}
      </div>
    </section>
  `;
}

function applyAnsiCodes(currentStyle, sequence) {
  const nextStyle = { ...currentStyle };
  const colorMap = {
    30: "#8aa096",
    31: "#ff8773",
    32: "#78d6a4",
    33: "#e8c56d",
    34: "#7ab5ff",
    35: "#d2a9ff",
    36: "#7de2ea",
    37: "#e6f2ec",
    90: "#7f938a",
    91: "#ff9f91",
    92: "#9be2bb",
    93: "#f6d98c",
    94: "#9cc8ff",
    95: "#e1c1ff",
    96: "#a5f0f5",
    97: "#ffffff",
  };
  const backgroundMap = {
    40: "#1f2e29",
    41: "#4c211e",
    42: "#113626",
    43: "#4d3a1b",
    44: "#1b314d",
    45: "#40284a",
    46: "#173b40",
    47: "#dde8e2",
    100: "#31433c",
    101: "#72352d",
    102: "#1f5138",
    103: "#6a541f",
    104: "#27456c",
    105: "#59356b",
    106: "#22545b",
    107: "#ffffff",
  };

  const codes = (sequence || "0")
    .split(";")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));

  if (codes.length === 0) {
    return { fg: "", bg: "", bold: false };
  }

  codes.forEach((code) => {
    if (code === 0) {
      nextStyle.fg = "";
      nextStyle.bg = "";
      nextStyle.bold = false;
    } else if (code === 1) {
      nextStyle.bold = true;
    } else if (code === 22) {
      nextStyle.bold = false;
    } else if (code === 39) {
      nextStyle.fg = "";
    } else if (code === 49) {
      nextStyle.bg = "";
    } else if (colorMap[code]) {
      nextStyle.fg = colorMap[code];
    } else if (backgroundMap[code]) {
      nextStyle.bg = backgroundMap[code];
    }
  });

  return nextStyle;
}

function wrapAnsiSegment(segment, styleState) {
  if (!segment) return "";
  const escaped = escapeHtml(segment);
  const styles = [];
  if (styleState.fg) styles.push(`color:${styleState.fg}`);
  if (styleState.bg) styles.push(`background:${styleState.bg}`);
  if (styleState.bold) styles.push("font-weight:700");
  if (styles.length === 0) return escaped;
  return `<span style="${styles.join(";")}">${escaped}</span>`;
}

function ansiToHtml(text) {
  let html = "";
  let styleState = { fg: "", bg: "", bold: false };
  let lastIndex = 0;

  text.replace(ANSI_SGR_RE, (match, sequence, offset) => {
    html += wrapAnsiSegment(text.slice(lastIndex, offset), styleState);
    styleState = applyAnsiCodes(styleState, sequence);
    lastIndex = offset + match.length;
    return match;
  });

  html += wrapAnsiSegment(text.slice(lastIndex), styleState);
  return html;
}

function renderTerminalOutput(run) {
  const rawOutput = run.output || "";
  if (!rawOutput) {
    if (isLiveRunStatus(run.status)) {
      return `
        <div class="terminal-placeholder">
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
          <p>Aguardando saída parcial do processo local…</p>
        </div>
      `;
    }
    return `<div class="terminal-placeholder"><p>Sem saída registrada para esta execução.</p></div>`;
  }

  const body = run.output_format === "ansi" ? ansiToHtml(rawOutput) : escapeHtml(rawOutput);
  return `<pre class="run-output">${body}</pre>`;
}

function renderExecutionPage() {
  const order = ["repo", "kata-1", "kata-2", "kata-4", "showcase"];
  const groups = order
    .map((scope) => ({
      scope,
      label: SCOPE_LABELS[scope] ?? scope,
      commands: state.commands.filter((command) => command.scope === scope),
    }))
    .filter((group) => group.commands.length > 0);
  const recommendedIds = state.commands
    .filter((command) => command.recommended)
    .map((command) => command.id);
  const lastStatus = state.activeRun ? runStatusLabel(state.activeRun.status ?? "queued") : "Sem execução";

  return `
    <section class="page-intro">
      <div class="section-heading">
        <p class="eyebrow">Execução Visual</p>
        <h2>Execução real primeiro, catálogo depois</h2>
        <p class="section-text">
          Esta área roda apenas comandos whitelist do backend local do showcase. O clique leva ao foco da ação,
          o loading aparece imediatamente e o painel abaixo é o ponto central para acompanhar o job.
        </p>
      </div>
      <div class="callout">
        O fluxo correto aqui é: clique em um comando, acompanhe o estado no painel ao vivo e só depois volte ao catálogo para explorar o restante.
      </div>
    </section>

    <section class="surface execution-shell" data-execution-focus="true">
      <div class="section-heading">
        <p class="eyebrow">Execução Atual</p>
        <h2>Foco da ação em andamento</h2>
        <p class="section-text">
          O retorno abaixo vem da API local do showcase e pode ser reexecutado quantas vezes você quiser a partir do catálogo permitido.
        </p>
      </div>
      <div data-run-console-host="true">
        ${renderRunConsole()}
      </div>
    </section>

    ${renderSpotlightCard({
      eyebrow: "Roteiro de Validação",
      title: "Comece pelo que mais prova a entrega",
      text: "Priorize os comandos recomendados. Eles cobrem a visão geral do projeto e evitam entrar cedo demais no catálogo completo.",
      actions: [
        { kind: "run", value: "repo-help", label: "Rodar ajuda do runner" },
        { kind: "run", value: "kata2-all", label: "Rodar suíte da Kata 2" },
        { kind: "route", value: "docs", label: "Cruzar com docs" },
      ],
      stats: [
        { label: "Recomendados", value: state.commandsLoaded ? recommendedIds.length : "…" },
        { label: "Comandos executáveis", value: state.commandsLoaded ? state.commands.filter((command) => command.runnable).length : "…" },
        { label: "Último status", value: lastStatus },
      ],
    })}

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Comece Por Aqui</p>
        <h2>Comandos recomendados</h2>
      </div>
      ${renderCommandCards(recommendedIds, { compact: true })}
    </section>

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Catálogo Completo</p>
        <h2>Comandos por escopo</h2>
      </div>
      <div class="card-stack">
        ${groups.map(
          (group) => `
            <article class="stack-card">
              <div class="section-heading">
                <p class="eyebrow">${escapeHtml(group.label)}</p>
                <h2>Comandos</h2>
              </div>
              <div class="command-grid">
                ${group.commands.map(renderCommandCard).join("")}
              </div>
            </article>
          `,
        ).join("")}
      </div>
    </section>
  `;
}

function renderRunConsole() {
  if (!state.activeRun) {
    return `
      <div class="run-console">
        <div class="empty-state">
          Nenhuma execução iniciada ainda. Escolha um comando do catálogo para abrir o painel ao vivo.
        </div>
      </div>
    `;
  }

  const run = state.activeRun;
  const progress = inferRunProgress(run);
  const isLive = isLiveRunStatus(run.status);
  const outputLineCount = run.output_line_count ?? (run.output || "").split("\n").filter(Boolean).length;
  const executedAt = formatTimestamp(run.updated_at ?? run.created_at);
  const outputVolumeLabel = outputLineCount === 0
    ? "sem saída"
    : `${outputLineCount} ${outputLineCount === 1 ? "linha" : "linhas"}`;
  const exitSummary = run.exit_code == null
    ? (["running", "queued", "starting"].includes(run.status) ? "em andamento" : "—")
    : `exit ${run.exit_code}`;
  const canOpenTargets = Array.isArray(run.access_links) && run.access_links.length > 0
    && !["error", "cancelled"].includes(run.status);

  return `
    <div class="run-console ${isLive ? "run-console-live" : ""}">
      <div class="run-summary">
        <div class="run-summary-main">
          <h3>${escapeHtml(run.title ?? "Execução")}</h3>
          <p>${escapeHtml(run.note ?? "")}</p>
        </div>
        <div class="run-status">
          ${renderPill(runStatusLabel(run.status ?? "queued"), runStatusTone(run.status ?? "queued"))}
        </div>
      </div>

      <div class="badge-row">
        ${renderPill(run.stage_label ?? "Sem etapa", "tone-muted")}
        ${renderPill(isLive ? "Atualizado pela API local" : "Snapshot final", isLive ? "tone-live" : "tone-ok")}
        ${run.output_format === "ansi" ? renderPill("ANSI detectado", "tone-live") : ""}
        ${run.output_truncated ? renderPill("Saída truncada para a UI", "tone-warn") : ""}
      </div>

      <div class="progress-shell">
        <div class="progress-meta">
          <span>${escapeHtml(run.stage_label ?? "Aguardando status")}</span>
          <span>${progress.indeterminate ? "ao vivo" : `${Math.round(progress.value)}%`}</span>
        </div>
        <div class="progress-bar ${progress.indeterminate ? "indeterminate" : ""}">
          <div class="progress-fill" style="width: ${progress.value}%"></div>
        </div>
      </div>

      <div class="run-metrics">
        <div class="metric-card">
          <span>Escopo</span>
          <strong>${escapeHtml(SCOPE_LABELS[run.scope] ?? run.scope ?? "—")}</strong>
        </div>
        <div class="metric-card">
          <span>Executado em</span>
          <strong>${executedAt}</strong>
        </div>
        <div class="metric-card">
          <span>Duração</span>
          <strong>${formatDuration(run.duration_ms)}</strong>
        </div>
        <div class="metric-card">
          <span>Saída</span>
          <strong>${outputVolumeLabel}</strong>
        </div>
        <div class="metric-card">
          <span>Resultado técnico</span>
          <strong>${exitSummary}</strong>
        </div>
      </div>

      ${renderCommandReferences(run.runner_command ?? "", run.manual_command ?? "")}

      <div class="command-actions">
        ${run.command_id ? `<button class="copy-button" data-run-command="${escapeHtml(run.command_id)}">Executar novamente</button>` : ""}
        ${run.output ? `<button class="copy-button secondary" data-copy-active-run-output="true">Copiar saída</button>` : ""}
        ${(run.status === "running" || run.status === "queued" || run.status === "starting") ? `<button class="copy-button secondary" data-cancel-active-run="true">Cancelar execução</button>` : ""}
      </div>

      ${canOpenTargets ? renderAccessLinks(run.access_links, { probing: isLive }) : ""}

      <div class="callout">
        Markdown e exemplos ficam na rota de docs. Aqui entram apenas o job ativo, o estado da execução e o retorno real entregue pela API local do showcase.
      </div>

      <div class="terminal-shell">
        <div class="terminal-head">
          <strong>Saída do terminal</strong>
          <span>${isLive ? "stream local em andamento" : "snapshot final consolidado"}</span>
        </div>
        <div class="terminal-screen">
          ${renderTerminalOutput(run)}
        </div>
      </div>
    </div>
  `;
}

function renderDocsPage() {
  const activeDocId = state.activeDocId || state.docs[0]?.id || "";
  const scopes = ["repo", "kata-1", "kata-2", "kata-3", "kata-4", "showcase"];
  const groups = scopes
    .map((scope) => ({
      scope,
      label: SCOPE_LABELS[scope] ?? scope,
      docs: state.docs.filter((doc) => doc.scope === scope),
    }))
    .filter((group) => group.docs.length > 0);
  const docsSpotlight = renderSpotlightCard({
    eyebrow: "Leitura Sugerida",
    title: "Abra primeiro os documentos que explicam as decisões",
    text: "A central de docs foi pensada para análise técnica, não para navegação de código. O ideal é começar pelo README, requisitos, engenharia e plano da Kata 3.",
    actions: [
      { kind: "doc", value: "repo-readme", label: "Abrir README", route: "docs" },
      { kind: "doc", value: "kata2-engenharia", label: "Abrir engenharia", route: "docs" },
      { kind: "doc", value: "kata3-plano", label: "Abrir PLANO.md", route: "docs" },
    ],
    stats: [
      { label: "Docs na vitrine", value: state.docsLoaded ? state.docs.length : "…" },
      { label: "Katas com análise", value: "4" },
      { label: "Código na UI", value: "não" },
    ],
  });

  return `
    <section class="page-intro">
      <div class="section-heading">
        <p class="eyebrow">Documentação Interna</p>
        <h2>Docs do projeto como leitura passiva</h2>
        <p class="section-text">
          Aqui entram os arquivos Markdown do repositório. Comandos continuam sendo documentação copiável; execução e reexecução permanecem restritas ao catálogo whitelist da rota Execução.
        </p>
      </div>
    </section>

    ${docsSpotlight}

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">Comece Por Aqui</p>
        <h2>Documentos principais</h2>
      </div>
      ${renderDocEntryButtons(PRIMARY_DOC_IDS)}
    </section>

    <section class="surface docs-shell">
      <aside class="docs-sidebar">
        ${state.docsLoading ? `
          <div class="empty-state">Carregando documentos…</div>
        ` : state.docsError ? `
          <div class="empty-state">${escapeHtml(state.docsError)}</div>
        ` : groups.map((group) => `
          <section class="docs-group">
            <p class="overline">${escapeHtml(group.label)}</p>
            <div class="docs-group-links">
              ${group.docs.map((doc) => `
                <button class="docs-link ${doc.id === activeDocId ? "active" : ""}" data-open-doc="${doc.id}" data-open-doc-route="docs">
                  <strong>${escapeHtml(doc.title)}</strong>
                  <span>${escapeHtml(doc.path)}</span>
                </button>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </aside>
      <div class="docs-content">
        ${activeDocId ? renderDocViewer(activeDocId, { route: "docs" }) : `
          <div class="empty-state">Escolha um documento para abrir no showcase.</div>
        `}
      </div>
    </section>
  `;
}

function renderKataPage(pageId) {
  const page = KATA_PAGES[pageId];
  if (!page) return "";

  const prelude = [];
  const appendix = [];
  const spotlightConfig = KATA_SPOTLIGHTS[pageId];
  const spotlightStats = [
    { label: "Arquivos-chave", value: page.files.length },
    { label: "Comandos", value: page.commandIds.length },
    { label: "Docs", value: page.docIds?.length ?? 0 },
  ];

  if (pageId === "kata-1") {
    appendix.push(renderKata1Explorer());
  }

  if (pageId === "kata-2") {
    appendix.push(`
      <section class="surface two-col-grid">
        <article class="stack-card">
          <div class="section-heading">
            <p class="eyebrow">Estrutura</p>
            <h2>Separação interna</h2>
          </div>
          ${renderFileList([
            { label: "Produto backend", path: "kata-2/backend/" },
            { label: "Produto frontend", path: "kata-2/frontend/" },
            { label: "Testes .NET", path: "kata-2/backend.tests/" },
            { label: "Artefatos locais", path: "kata-2/artifacts/" },
          ])}
        </article>
        <article class="stack-card">
          <div class="section-heading">
            <p class="eyebrow">Contrato HTTP</p>
            <h2>Endpoints expostos</h2>
          </div>
          ${renderNotesList(page.endpoints)}
        </article>
      </section>

      <section class="surface">
        <div class="section-heading">
          <p class="eyebrow">Artefatos</p>
          <h2>Saídas separadas do código</h2>
        </div>
        ${renderFileList(page.artifacts.map((path) => ({ label: "Saída local", path })))}
      </section>
    `);
  }

  if (pageId === "kata-3") {
    prelude.push(`
      <section class="surface">
        <div class="section-heading">
          <p class="eyebrow">Leitura Executiva</p>
          <h2>Kata 3 descrita visualmente</h2>
        </div>
        <div class="route-grid">
          ${KATA3_HIGHLIGHTS.map((item) => `
            <article class="info-card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="surface">
        <div class="section-heading">
          <p class="eyebrow">Seções do Documento</p>
          <h2>Rastreabilidade da análise</h2>
        </div>
        ${renderNotesList(page.sections)}
      </section>

      <section class="surface">
        <div class="section-heading">
          <p class="eyebrow">Documento Interno</p>
          <h2>PLANO.md dentro do showcase</h2>
        </div>
        ${renderDocViewer("kata3-plano", { route: "kata-3" })}
      </section>
    `);
  }

  if (pageId === "kata-4") {
    appendix.push(`
      <section class="surface">
        <div class="section-heading">
          <p class="eyebrow">Saídas geradas</p>
          <h2>Artefatos do pipeline</h2>
        </div>
        ${renderFileList(page.outputs.map((path) => ({ label: "Output", path })))}
      </section>
    `);
  }

  return `
    <section class="page-intro">
      <div class="section-heading">
        <p class="eyebrow">${escapeHtml(page.subtitle)}</p>
        <h2>${escapeHtml(page.title)}</h2>
        <p class="section-text">${escapeHtml(page.summary)}</p>
      </div>
    </section>

    ${spotlightConfig ? renderSpotlightCard({
      ...spotlightConfig,
      stats: spotlightStats,
      tone: pageId === "kata-3" ? "spotlight-primary" : "",
    }) : ""}

    ${prelude.join("")}

    ${page.commandIds.length > 0 ? `
      <section class="surface">
        <div class="section-heading">
          <p class="eyebrow">Comandos</p>
          <h2>Runner, manual e execução visual</h2>
        </div>
        ${renderCommandCards(page.commandIds)}
      </section>
    ` : pageId !== "kata-3" ? `
      <section class="surface">
        <div class="empty-state">
          Esta kata é documental. O arquivo principal está em <code>${escapeHtml(page.files[0])}</code>.
        </div>
      </section>
    ` : ""}

    ${page.docIds?.length && pageId !== "kata-3" ? `
      <section class="surface">
        <div class="section-heading">
          <p class="eyebrow">Documentação</p>
          <h2>Arquivos Markdown</h2>
        </div>
        ${renderDocEntryButtons(page.docIds, "docs")}
      </section>
    ` : ""}

    <section class="surface two-col-grid">
      <article class="stack-card">
        <div class="section-heading">
          <p class="eyebrow">Arquivos-chave</p>
          <h2>Onde está o que importa</h2>
        </div>
        ${renderFileList(page.files.map((path) => ({ label: "Referência", path })))}
      </article>
      <article class="stack-card">
        <div class="section-heading">
          <p class="eyebrow">Leitura</p>
          <h2>O que vale notar</h2>
        </div>
        ${renderNotesList(page.notes)}
      </article>
    </section>

    ${appendix.join("")}
  `;
}

function renderKata1Explorer() {
  return `
    <section class="surface" data-volume-focus="true">
      <div class="section-heading">
        <p class="eyebrow">Playground Visual</p>
        <h2>Kata 1 em modo explorável</h2>
        <p class="section-text">
          Esta área existe para mostrar o comportamento do algoritmo de forma visual.
          A demonstração formal continua acessível pelos comandos em Python e pelo runner.
        </p>
      </div>
      <div class="explore-grid">
        <article class="explorer-card">
          <div class="explorer-header">
            <h3>Casos de negócio</h3>
            <p>Escolha um cenário e veja entrada, resultado calculado e validação.</p>
          </div>
          <div class="case-tab-row" id="case-tab-row"></div>
          <div class="output-stack" id="case-output"></div>
        </article>

        <article class="explorer-card">
          <div class="explorer-header">
            <h3>Benchmark manual</h3>
            <p>
              Até <strong>2.000</strong> pacientes a simulação roda no navegador. Acima disso,
              o showcase delega a medição para a API local e acompanha o job em background.
            </p>
          </div>
          <div class="callout">
            Esta seção existe para testar volume e tempo de retorno manualmente. O limite de troca continua fixo:
            até 2.000 localmente no navegador, acima disso pela API local do showcase.
          </div>
          <div class="benchmark-preset-row">
            ${VOLUME_PRESETS.map((value) => `
              <button class="case-tab ${value === volumeCount ? "active" : ""}" data-volume-preset="${value}">
                ${value.toLocaleString("pt-BR")}
              </button>
            `).join("")}
          </div>
          <label class="range-label" for="volume-range">Quantidade de pacientes</label>
          <div class="range-row">
            <input
              id="volume-range"
              type="range"
              min="1"
              max="20000"
              step="1"
              value="${volumeCount}"
            />
            <strong id="volume-value">${volumeCount}</strong>
          </div>
          <p class="range-hint">
            Ajuste livremente o volume. Ao iniciar uma nova medição, a execução anterior é descartada e a leitura recomeça com foco neste painel.
          </p>
          <div class="output-stack" id="volume-output"></div>
        </article>
      </div>
    </section>
  `;
}

function renderPage() {
  switch (state.route) {
    case "overview":
      return renderOverviewPage();
    case "execucao":
      return renderExecutionPage();
    case "docs":
      return renderDocsPage();
    case "kata-1":
    case "kata-2":
    case "kata-3":
    case "kata-4":
      return renderKataPage(state.route);
    default:
      return renderOverviewPage();
  }
}

function animateVerticalSwap(element, direction = 1, distance = 28) {
  if (!element || typeof element.animate !== "function" || prefersReducedMotion()) return;
  element.animate(
    [
      {
        opacity: 0,
        transform: `translateY(${direction > 0 ? distance : -distance}px)`,
      },
      {
        opacity: 1,
        transform: "translateY(0)",
      },
    ],
    {
      duration: 280,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    },
  );
}

function syncRouteData() {
  if (state.route === "docs") {
    if (!state.docsLoaded) {
      void loadDocs();
      return;
    }
    if (!state.activeDocId && state.docs[0]) {
      state.activeDocId = state.docs[0].id;
      renderApp({ animatePage: false, animateDoc: false, syncData: false });
      void ensureDocContent(state.docs[0].id);
      return;
    }
    if (
      state.activeDocId
      && !state.docCache[state.activeDocId]
      && !state.docErrors[state.activeDocId]
    ) {
      void ensureDocContent(state.activeDocId);
    }
  }

  if (state.route === "kata-3") {
    if (!state.docsLoaded) {
      void loadDocs();
      return;
    }
    if (!state.docCache["kata3-plano"] && !state.docErrors["kata3-plano"]) {
      void ensureDocContent("kata3-plano");
    }
  }
}

function renderApp(options = {}) {
  renderNav();
  renderHeaderMeta();

  const container = document.querySelector("#app");
  if (!container) return;

  if (state.route !== "kata-1") {
    abortActiveVolumeRun();
  }

  container.innerHTML = `
    <div class="page-frame" data-route-frame="${escapeHtml(state.route)}">
      ${renderPage()}
    </div>
  `;

  if (options.animatePage !== false) {
    animateVerticalSwap(container.querySelector(".page-frame"), pendingRouteDirection);
  }
  if (options.animateDoc !== false) {
    animateVerticalSwap(container.querySelector("[data-doc-viewer='true']"), pendingDocDirection, 22);
  }
  if (options.syncData !== false) {
    syncRouteData();
  }

  if (state.route === "kata-1") {
    renderCaseTabs();
    renderCaseOutput();
    setupExplorer();
  }
}
