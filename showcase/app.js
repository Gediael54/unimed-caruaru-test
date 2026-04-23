function renderBootstrapError(title, details) {
  const app = document.querySelector("#app");
  if (!app) return;

  const lines = Array.isArray(details) ? details : [details];
  app.innerHTML = `
    <section class="page-intro">
      <div class="section-heading">
        <p class="eyebrow">Diagnóstico do Showcase</p>
        <h2>${title}</h2>
        <p class="section-text">
          O HTML base abriu, mas o bootstrap completo do showcase não terminou.
          Em vez de deixar a página vazia, esta tela mostra o que verificar.
        </p>
      </div>
    </section>

    <section class="surface">
      <div class="section-heading">
        <p class="eyebrow">O que conferir</p>
        <h2>Recuperação rápida</h2>
      </div>
      <ul class="checklist">
        ${lines.map((line) => `<li>${line}</li>`).join("")}
      </ul>
    </section>
  `;
}

function listMissingDependencies() {
  const required = [
    "renderApp",
    "loadHealth",
    "loadCommands",
    "loadDocs",
    "copyText",
  ];

  return required.filter((name) => typeof window[name] !== "function");
}

function startShowcase() {
  const missing = listMissingDependencies();
  if (missing.length > 0) {
    renderBootstrapError("Assets do showcase não carregaram por completo", [
      `Dependências ausentes no bootstrap: ${missing.join(", ")}.`,
      "Faça um hard refresh no navegador: Ctrl+Shift+R.",
      "Confirme no terminal do showcase se os arquivos /js/core.js, /js/render.js, /js/explorer.js e /js/events.js aparecem no log HTTP.",
      "Se o problema persistir, reinicie o showcase pelo runner oficial.",
    ]);
    return;
  }

  try {
    window.renderApp();
    void window.loadHealth();
    void window.loadCommands();
    void window.loadDocs();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    renderBootstrapError("Falha durante a inicialização do showcase", [
      `Erro capturado: ${message}.`,
      "Recarregue a página após reiniciar o showcase.",
      "Se continuar, verifique o console do navegador e o log HTTP no terminal do showcase.",
    ]);
  }
}

startShowcase();
