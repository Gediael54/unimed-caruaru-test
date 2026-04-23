document.addEventListener("click", (event) => {
  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) {
    setRoute(routeTarget.getAttribute("data-route"));
    return;
  }

  const copyTarget = event.target.closest("[data-copy], [data-copy-base64]");
  if (copyTarget) {
    const encoded = copyTarget.getAttribute("data-copy-base64");
    const value = encoded ? decodeCopyValue(encoded) : copyTarget.getAttribute("data-copy");
    copyText(value, copyTarget);
    return;
  }

  const liveOutputCopyTarget = event.target.closest("[data-copy-active-run-output]");
  if (liveOutputCopyTarget && state.activeRun?.output) {
    copyText(state.activeRun.output, liveOutputCopyTarget);
    return;
  }

  const runTarget = event.target.closest("[data-run-command]");
  if (runTarget) {
    void startCommandRun(runTarget.getAttribute("data-run-command"));
    return;
  }

  const cancelTarget = event.target.closest("[data-cancel-active-run]");
  if (cancelTarget) {
    void cancelActiveRun();
    return;
  }

  const docTarget = event.target.closest("[data-open-doc]");
  if (docTarget) {
    void openDoc(
      docTarget.getAttribute("data-open-doc"),
      docTarget.getAttribute("data-open-doc-route") || "docs",
    );
    return;
  }

  const retryDocTarget = event.target.closest("[data-retry-doc]");
  if (retryDocTarget) {
    void openDoc(
      retryDocTarget.getAttribute("data-retry-doc"),
      retryDocTarget.getAttribute("data-retry-doc-route") || "docs",
      { force: true },
    );
    return;
  }

  const caseTarget = event.target.closest("[data-case-id]");
  if (caseTarget) {
    selectedCaseId = caseTarget.getAttribute("data-case-id");
    renderCaseTabs();
    renderCaseOutput();
  }
});

window.addEventListener("hashchange", () => {
  if (suppressNextHashRender) {
    suppressNextHashRender = false;
    return;
  }
  state.route = getRouteFromHash();
  renderApp();
});
