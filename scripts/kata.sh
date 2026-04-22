#!/usr/bin/env bash
#
# Runner do Teste Técnico Unimed Caruaru
# --------------------------------------
# Dois caminhos para o avaliador:
#   1) Menu interativo ............. bash scripts/kata.sh
#   2) Comando direto .............. bash scripts/kata.sh <escopo> <acao>
#
# Tudo que o enunciado pede (Partes obrigatórias) está destacado no menu
# e também pode ser rodado manualmente — veja a seção "Ajuda" ou o README.

set -u -o pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOX_RULE="=================================================================="
THIN_RULE="------------------------------------------------------------------"
SHOWCASE_PORT="8787"
KATA2_TESTS_PROJECT="kata-2/backend.tests/TaskBoard.Api.Tests.csproj"
KATA2_WEB_DIR="kata-2/frontend"
KATA2_API_PROJECT="kata-2/backend/TaskBoard.Api.csproj"
KATA2_ARTIFACTS_DIR="kata-2/artifacts"
KATA2_LOG_FILE="$KATA2_ARTIFACTS_DIR/logs/backend.log"

# ---------------------------------------------------------------------------
# Paleta de cores — identidade Unimed (verde). Degrada para texto sem cor
# quando o terminal não suporta (ex.: CI, TERM=dumb, pipe).
# ---------------------------------------------------------------------------

supports_color_output() {
  [[ -t 1 && -n "${TERM:-}" && "${TERM:-}" != "dumb" ]]
}

enable_color_palette() {
  COLOR_RESET=$'\033[0m'
  COLOR_BOLD=$'\033[1m'
  COLOR_DIM=$'\033[2m'
  COLOR_UNIMED=$'\033[38;5;29m'   # verde Unimed aproximado
  COLOR_UNIMED_BOLD=$'\033[1;38;5;29m'
  COLOR_ACCENT=$'\033[38;5;35m'   # verde claro p/ destaque
  COLOR_CYAN=$'\033[36m'
  COLOR_GREEN=$'\033[32m'
  COLOR_YELLOW=$'\033[33m'
  COLOR_RED=$'\033[31m'
  COLOR_GRAY=$'\033[38;5;244m'
}

disable_color_palette() {
  COLOR_RESET=""
  COLOR_BOLD=""
  COLOR_DIM=""
  COLOR_UNIMED=""
  COLOR_UNIMED_BOLD=""
  COLOR_ACCENT=""
  COLOR_CYAN=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_RED=""
  COLOR_GRAY=""
}

init_color_palette() {
  local setup_fn="disable_color_palette"
  supports_color_output && setup_fn="enable_color_palette"
  "$setup_fn"
}

init_color_palette

ICON_OK="[OK]"
ICON_WARN="[!]"
ICON_ERR="[X]"
ICON_INFO="[i]"
ICON_STAR="*"

# ---------------------------------------------------------------------------
# Primitivos de saída
# ---------------------------------------------------------------------------

print_banner() {
  printf '\n'
  printf '%b%s%b\n' "${COLOR_UNIMED_BOLD}" "${BOX_RULE}" "${COLOR_RESET}"
  printf '%b   UNIMED CARUARU  -  Teste Tecnico de Desenvolvimento 2026%b\n' \
    "${COLOR_UNIMED_BOLD}" "${COLOR_RESET}"
  printf '%b   Candidato: Gediael Kallebe da Silva Andrade%b\n' \
    "${COLOR_DIM}" "${COLOR_RESET}"
  printf '%b%s%b\n' "${COLOR_UNIMED_BOLD}" "${BOX_RULE}" "${COLOR_RESET}"
}

print_section() {
  local label="$1"
  printf '\n%b--- %s ---%b\n' "${COLOR_UNIMED_BOLD}" "$label" "${COLOR_RESET}"
}

print_title() {
  local title="$1"
  local subtitle="${2:-}"

  echo
  printf '%b>> %s%b\n' "${COLOR_UNIMED_BOLD}" "$title" "${COLOR_RESET}"
  if [[ -n "$subtitle" ]]; then
    printf '%b%s%b\n' "${COLOR_DIM}" "$subtitle" "${COLOR_RESET}"
  fi
}

print_info() {
  printf '%b%s%b %s\n' "${COLOR_CYAN}" "${ICON_INFO}" "${COLOR_RESET}" "$1"
}

print_success() {
  printf '%b%s%b %s\n' "${COLOR_GREEN}" "${ICON_OK}" "${COLOR_RESET}" "$1"
}

print_warning() {
  printf '%b%s%b %s\n' "${COLOR_YELLOW}" "${ICON_WARN}" "${COLOR_RESET}" "$1"
}

print_error() {
  printf '%b%s%b %s\n' "${COLOR_RED}" "${ICON_ERR}" "${COLOR_RESET}" "$1"
}

clear_screen_if_interactive() {
  if [[ -t 1 ]] && command -v clear >/dev/null 2>&1; then
    clear
  fi
}

print_menu_item() {
  local key="$1"
  local label="$2"
  local description="${3:-}"
  local highlighted="${4:-no}"

  if [[ "$highlighted" == "star" ]]; then
    printf '  %b[%s]%b %b%s%b %b%s obrigatorio pelo enunciado%b' \
      "${COLOR_BOLD}" "$key" "${COLOR_RESET}" \
      "${COLOR_UNIMED_BOLD}" "$label" "${COLOR_RESET}" \
      "${COLOR_ACCENT}" "${ICON_STAR}" "${COLOR_RESET}"
  else
    printf '  %b[%s]%b %s' "${COLOR_BOLD}" "$key" "${COLOR_RESET}" "$label"
  fi
  if [[ -n "$description" ]]; then
    printf '%b  %s%b' "${COLOR_DIM}" "$description" "${COLOR_RESET}"
  fi
  printf '\n'
}

pause_menu() {
  echo
  read -r -p "Pressione Enter para continuar..." _
}

print_box_header() {
  local title="$1"
  printf '\n'
  printf '%b%s%b\n' "${COLOR_UNIMED_BOLD}" "${BOX_RULE}" "${COLOR_RESET}"
  printf '%b  %s%b\n' "${COLOR_UNIMED_BOLD}" "$title" "${COLOR_RESET}"
  printf '%b%s%b\n' "${COLOR_UNIMED_BOLD}" "${BOX_RULE}" "${COLOR_RESET}"
}

print_thin_rule() {
  printf '%b%s%b\n' "${COLOR_GRAY}" "${THIN_RULE}" "${COLOR_RESET}"
}

print_metadata_line() {
  local label="$1"
  local value="$2"
  printf '  %b%-9s%b %s\n' "${COLOR_DIM}" "$label" "${COLOR_RESET}" "$value"
}

print_command_line() {
  printf '  %b%-9s%b ' "${COLOR_DIM}" "Comando" "${COLOR_RESET}"
  printf '%q ' "$@"
  printf '\n'
}

print_help_command() {
  local command="$1"
  local description="$2"
  local highlighted="${3:-no}"
  local prefix="     "
  if [[ "$highlighted" == "star" ]]; then
    prefix="  ${COLOR_ACCENT}${ICON_STAR}${COLOR_RESET}  "
  fi
  printf '%b%s%-44s%b %s\n' \
    "$prefix" \
    "${COLOR_BOLD}" \
    "$command" \
    "${COLOR_RESET}" \
    "$description"
}

print_help_section_title() {
  local title="$1"
  printf '\n%b%s%b\n' "${COLOR_UNIMED_BOLD}" "$title" "${COLOR_RESET}"
}

print_help_note() {
  printf '     %s\n' "$1"
}

# ---------------------------------------------------------------------------
# Detecção de ambiente (exibido no menu principal)
# ---------------------------------------------------------------------------

detect_tool_status() {
  local tool="$1"
  local version_cmd="$2"
  if command -v "$tool" >/dev/null 2>&1; then
    local version
    version="$(eval "$version_cmd" 2>/dev/null | head -n 1)"
    version="${version:-disponivel}"
    printf '%b%s%b %-9s %b%s%b' \
      "${COLOR_GREEN}" "${ICON_OK}" "${COLOR_RESET}" \
      "$tool" \
      "${COLOR_DIM}" "$version" "${COLOR_RESET}"
  else
    printf '%b%s%b %-9s %bnao encontrado%b' \
      "${COLOR_RED}" "${ICON_ERR}" "${COLOR_RESET}" \
      "$tool" \
      "${COLOR_RED}" "${COLOR_RESET}"
  fi
}

print_environment_panel() {
  print_section "AMBIENTE DETECTADO"
  printf '  %s\n' "$(detect_tool_status python3 'python3 --version')"
  printf '  %s\n' "$(detect_tool_status dotnet  'dotnet --version')"
  printf '  %s\n' "$(detect_tool_status npm     'npm --version')"
  printf '  %s\n' "$(detect_tool_status curl    'curl --version | head -n 1 | awk "{print \$2}"')"
}

# ---------------------------------------------------------------------------
# Execução de passos
# ---------------------------------------------------------------------------

format_duration() {
  local total="$1"
  local mins=$(( total / 60 ))
  local secs=$(( total % 60 ))
  if (( mins > 0 )); then
    printf '%dm %02ds' "$mins" "$secs"
  else
    printf '%ds' "$secs"
  fi
}

print_step_preamble() {
  local title="$1"
  local start_iso="$2"
  shift 2
  print_box_header "$title"
  print_metadata_line "Diretorio" "$ROOT_DIR"
  print_command_line "$@"
  print_metadata_line "Inicio" "$start_iso"
  print_thin_rule
}

print_step_result() {
  local exit_code="$1"
  local elapsed="$2"
  print_thin_rule
  if (( exit_code == 0 )); then
    printf '  %b%s Concluido em %s (codigo 0)%b\n' \
      "${COLOR_GREEN}" "${ICON_OK}" "$(format_duration "$elapsed")" "${COLOR_RESET}"
  else
    printf '  %b%s Falha apos %s (codigo %d)%b\n' \
      "${COLOR_RED}" "${ICON_ERR}" "$(format_duration "$elapsed")" "$exit_code" "${COLOR_RESET}"
  fi
  printf '\n'
}

run_step() {
  local title="$1"
  shift
  local exit_code=0
  local start_ts end_ts elapsed
  local start_iso

  start_ts=$(date +%s)
  start_iso=$(date +'%Y-%m-%d %H:%M:%S')
  print_step_preamble "$title" "$start_iso" "$@"

  if (
    cd "$ROOT_DIR" &&
      "$@"
  ); then
    exit_code=0
  else
    exit_code=$?
  fi

  end_ts=$(date +%s)
  elapsed=$(( end_ts - start_ts ))
  print_step_result "$exit_code" "$elapsed"
  return "$exit_code"
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    print_error "Comando '$command_name' nao encontrado no ambiente."
    return 127
  fi
}

require_commands() {
  local command_name
  for command_name in "$@"; do
    require_command "$command_name" || return $?
  done
}

# ---------------------------------------------------------------------------
# Kata 1 — Fila de Triagem
# ---------------------------------------------------------------------------

kata1_verify() {
  require_command python3 || return $?
  run_step "Kata 1 · validacao completa resumida" python3 kata-1/verify.py
}

kata1_verify_verbose() {
  require_command python3 || return $?
  run_step "Kata 1 · validacao completa detalhada" python3 kata-1/verify.py --mode full-verbose
}

kata1_tests() {
  require_command python3 || return $?
  run_step "Kata 1 · testes unitarios" python3 -m unittest discover -s kata-1 -p 'test_*.py'
}

kata1_demo() {
  require_command python3 || return $?
  run_step "Kata 1 · exemplos executaveis" python3 kata-1/verify.py --mode demo
}

kata1_benchmark() {
  require_command python3 || return $?
  run_step "Kata 1 · benchmark ilustrativo" python3 kata-1/verify.py --mode benchmark
}

kata1_explore() {
  require_command python3 || return $?
  run_step "Kata 1 · explorer interativo" python3 kata-1/explore.py
}

# ---------------------------------------------------------------------------
# Kata 2 — Backend (.NET), Frontend (React+TS) e fluxo unificado
# ---------------------------------------------------------------------------

kata2_backend_build() {
  require_command dotnet || return $?
  run_step "Kata 2 · build do backend" \
    dotnet build "$KATA2_API_PROJECT" --no-restore
}

kata2_backend_restore() {
  require_command dotnet || return $?
  run_step "Kata 2 · restore do backend e testes" \
    dotnet restore "$KATA2_TESTS_PROJECT"
}

kata2_backend_dev() {
  require_command dotnet || return $?
  run_step "Kata 2 · backend em modo desenvolvimento" \
    dotnet run --project "$KATA2_API_PROJECT" --urls http://localhost:5000
}

kata2_backend_tests() {
  require_command dotnet || return $?
  run_step "Kata 2 · testes unitarios do backend" \
    dotnet run --project "$KATA2_TESTS_PROJECT" --no-restore -- backend
}

kata2_api_tests() {
  require_command dotnet || return $?
  run_step "Kata 2 · testes de contrato da API" \
    dotnet run --project "$KATA2_TESTS_PROJECT" --no-restore -- api
}

kata2_test_suite() {
  require_command dotnet || return $?
  run_step "Kata 2 · suite .NET completa" \
    dotnet test "$KATA2_TESTS_PROJECT" --no-restore
}

kata2_frontend_install() {
  require_command npm || return $?
  run_step "Kata 2 · instalar dependencias do frontend" npm --prefix "$KATA2_WEB_DIR" install
}

kata2_frontend_build() {
  require_command npm || return $?
  run_step "Kata 2 · build do frontend" npm --prefix "$KATA2_WEB_DIR" run build
}

kata2_frontend_tests() {
  require_command npm || return $?
  run_step "Kata 2 · testes do frontend" npm --prefix "$KATA2_WEB_DIR" run test
}

kata2_frontend_lint() {
  require_command npm || return $?
  run_step "Kata 2 · lint do frontend" npm --prefix "$KATA2_WEB_DIR" run lint
}

kata2_frontend_audit() {
  require_command npm || return $?
  run_step "Kata 2 · auditoria do frontend (requer internet)" \
    npm --prefix "$KATA2_WEB_DIR" audit --audit-level=high
}

kata2_frontend_dev() {
  require_command npm || return $?
  run_step "Kata 2 · frontend em modo desenvolvimento" npm --prefix "$KATA2_WEB_DIR" run dev
}

# Fluxo unificado: sobe backend em background, aguarda /health, sobe
# frontend em foreground. Ctrl+C encerra os dois via trap.
# Trade-offs documentados em kata-2/README.md.

KATA2_DEV_BACKEND_PID=""
KATA2_DEV_LOG=""

kata2_dev_log_path() {
  printf '%s' "$ROOT_DIR/$KATA2_LOG_FILE"
}

kata2_dev_prepare_log() {
  KATA2_DEV_LOG="$(kata2_dev_log_path)"
  mkdir -p "$(dirname "$KATA2_DEV_LOG")"
  : > "$KATA2_DEV_LOG"
}

kata2_dev_print_header() {
  print_box_header "KATA 2 · EXECUCAO INTEGRADA (BACKEND + FRONTEND)"
  print_metadata_line "Backend" "http://localhost:5000"
  print_metadata_line "Frontend" "http://localhost:5173"
  print_metadata_line "Logs" "$KATA2_LOG_FILE"
  print_metadata_line "Encerrar" "Ctrl+C (o backend sera finalizado automaticamente)"
  print_thin_rule
}

kata2_dev_start_backend() {
  (
    cd "$ROOT_DIR" && \
    dotnet run --project "$KATA2_API_PROJECT" \
      --urls http://localhost:5000
  ) >"$KATA2_DEV_LOG" 2>&1 &
  KATA2_DEV_BACKEND_PID=$!
  trap kata2_dev_cleanup INT TERM EXIT
}

kata2_dev_print_log_tail() {
  print_info "Ultimas linhas do log:"
  tail -n 20 "$KATA2_DEV_LOG" || true
}

kata2_dev_backend_failed() {
  local message="$1"
  print_error "$message"
  kata2_dev_print_log_tail
  kata2_dev_cleanup
  return 1
}

kata2_dev_wait_for_backend() {
  local attempt=0
  print_info "Aguardando backend responder em /health (ate 60s)..."
  while (( attempt < 60 )); do
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
      print_success "Backend pronto (PID ${KATA2_DEV_BACKEND_PID})."
      return 0
    fi
    if ! kill -0 "$KATA2_DEV_BACKEND_PID" 2>/dev/null; then
      kata2_dev_backend_failed "Backend finalizou antes de responder ao health check."
      return 1
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  kata2_dev_backend_failed "Backend nao respondeu ao health check em 60s."
}

kata2_dev_run_frontend() {
  echo
  print_info "Subindo frontend em modo desenvolvimento..."
  echo
  (cd "$ROOT_DIR" && npm --prefix "$KATA2_WEB_DIR" run dev)
}

kata2_dev_cleanup() {
  trap - INT TERM EXIT
  local pid="$KATA2_DEV_BACKEND_PID"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    printf '\n'
    print_info "Encerrando backend (PID ${pid})..."
    kill "$pid" 2>/dev/null || true
    local wait_count=0
    while kill -0 "$pid" 2>/dev/null && (( wait_count < 10 )); do
      sleep 1
      wait_count=$((wait_count + 1))
    done
    if kill -0 "$pid" 2>/dev/null; then
      print_warning "Backend nao respondeu ao sinal TERM, forcando com KILL."
      kill -9 "$pid" 2>/dev/null || true
    fi
    print_success "Backend encerrado."
  fi
  KATA2_DEV_BACKEND_PID=""
}

kata2_dev() {
  require_commands dotnet npm curl || return $?
  kata2_dev_prepare_log
  kata2_dev_print_header
  kata2_dev_start_backend
  kata2_dev_wait_for_backend || return $?
  kata2_dev_run_frontend
  local frontend_exit=$?

  kata2_dev_cleanup
  return "$frontend_exit"
}

kata2_all() {
  kata2_backend_restore &&
    kata2_backend_build &&
    kata2_backend_tests &&
    kata2_api_tests &&
    kata2_frontend_lint &&
    kata2_frontend_tests &&
    kata2_frontend_build
}

# ---------------------------------------------------------------------------
# Kata 4 — Pipeline de Indicadores
# ---------------------------------------------------------------------------

kata4_pipeline() {
  require_command python3 || return $?
  run_step "Kata 4 · pipeline" python3 kata-4/pipeline.py
}

kata4_tests() {
  require_command python3 || return $?
  run_step "Kata 4 · testes" python3 -m unittest discover -s kata-4 -p 'test_*.py'
}

kata4_all() {
  kata4_pipeline && kata4_tests
}

# ---------------------------------------------------------------------------
# Validação completa do repositório
# ---------------------------------------------------------------------------

validate_all() {
  kata1_verify &&
    kata2_all &&
    kata4_all
}

showcase_serve() {
  require_command python3 || return $?
  print_box_header "SHOWCASE · PORTAL VISUAL DO REPOSITORIO"
  print_metadata_line "URL" "http://localhost:${SHOWCASE_PORT}"
  print_metadata_line "Origem" "showcase/"
  print_metadata_line "Modo" "visao geral, docs, comandos e playground visual"
  print_metadata_line "Escopo" "camada de apresentacao; terminal continua oficial"
  print_metadata_line "Encerrar" "Ctrl+C"
  print_thin_rule

  (
    cd "$ROOT_DIR" && \
    python3 showcase/server.py --port "$SHOWCASE_PORT"
  )
  local exit_code=$?

  if (( exit_code == 130 )); then
    print_success "Showcase encerrado pelo usuario."
    return 0
  fi

  return "$exit_code"
}

showcase_tests() {
  require_command python3 || return $?
  run_step "Showcase · testes da API local" \
    python3 -m unittest discover -s showcase -p 'test_*.py'
}

declare -A KATA1_MENU_ACTIONS=(
  ["1"]="kata1_tests"
  ["2"]="kata1_demo"
  ["3"]="kata1_verify"
  ["4"]="kata1_verify_verbose"
  ["5"]="kata1_benchmark"
  ["6"]="kata1_explore"
)

declare -A KATA2_MENU_ACTIONS=(
  ["1"]="kata2_dev"
  ["2"]="kata2_backend_dev"
  ["3"]="kata2_frontend_dev"
  ["4"]="kata2_backend_restore"
  ["5"]="kata2_backend_build"
  ["6"]="kata2_backend_tests"
  ["7"]="kata2_api_tests"
  ["8"]="kata2_frontend_install"
  ["9"]="kata2_frontend_lint"
  ["10"]="kata2_frontend_tests"
  ["11"]="kata2_frontend_build"
  ["12"]="kata2_frontend_audit"
  ["13"]="kata2_all"
)

declare -A KATA4_MENU_ACTIONS=(
  ["1"]="kata4_pipeline"
  ["2"]="kata4_tests"
  ["3"]="kata4_all"
)

run_menu_action() {
  local choice="$1"
  local map_name="$2"
  local -n action_map="$map_name"
  local action="${action_map[$choice]-}"
  if [[ -z "$action" ]]; then
    return 2
  fi
  "$action"
  local exit_code=$?
  pause_menu
  return "$exit_code"
}

# ---------------------------------------------------------------------------
# Ajuda (também lista tudo que pode ser executado manualmente)
# ---------------------------------------------------------------------------

show_help() {
  print_title "Runner dos Katas" "Todos os comandos disponiveis via linha de comando"
  cat <<EOF

Dois caminhos para executar o teste:

  1) Menu interativo: ${COLOR_BOLD}bash scripts/kata.sh${COLOR_RESET}
  2) Comando direto:  ${COLOR_BOLD}bash scripts/kata.sh <escopo> <acao>${COLOR_RESET}

Itens marcados com ${COLOR_ACCENT}${ICON_STAR}${COLOR_RESET} sao obrigatorios pelo enunciado.
Demais comandos sao extras implementados para facilitar a avaliacao.
EOF

  print_help_section_title "KATA 1 — Fila de triagem"
  print_help_command "bash scripts/kata.sh kata1 tests" "Testes unitarios (obrigatorio pelo enunciado)" "star"
  print_help_command "bash scripts/kata.sh kata1 demo" "Exemplos executaveis do algoritmo" "star"
  print_help_command "bash scripts/kata.sh kata1 verify" "Validacao completa resumida (extra)"
  print_help_command "bash scripts/kata.sh kata1 verify-verbose" "Validacao completa detalhada (extra)"
  print_help_command "bash scripts/kata.sh kata1 benchmark" "Demonstracao de escala (extra)"
  print_help_command "bash scripts/kata.sh kata1 explore" "Explorer interativo de casos e volume (extra)"

  print_help_section_title "KATA 2 — Painel de Tarefas"
  print_help_command "bash scripts/kata.sh kata2 dev" "Sobe backend + frontend em um comando" "star"
  print_help_command "bash scripts/kata.sh kata2 backend-dev" "Backend em http://localhost:5000" "star"
  print_help_command "bash scripts/kata.sh kata2 frontend-dev" "Frontend em http://localhost:5173" "star"
  print_help_command "bash scripts/kata.sh kata2 backend-restore" "Restore de pacotes .NET (extra)"
  print_help_command "bash scripts/kata.sh kata2 backend-build" "Build do backend (extra)"
  print_help_command "bash scripts/kata.sh kata2 backend-tests" "Testes unitarios do backend (extra)"
  print_help_command "bash scripts/kata.sh kata2 api-tests" "Testes de contrato da API (extra)"
  print_help_command "bash scripts/kata.sh kata2 frontend-install" "Instala dependencias do frontend (extra)"
  print_help_command "bash scripts/kata.sh kata2 frontend-lint" "Lint do frontend (extra)"
  print_help_command "bash scripts/kata.sh kata2 frontend-tests" "Testes do frontend (extra)"
  print_help_command "bash scripts/kata.sh kata2 frontend-build" "Build de producao do frontend (extra)"
  print_help_command "bash scripts/kata.sh kata2 frontend-audit" "Auditoria de dependencias (requer internet)"
  print_help_command "bash scripts/kata.sh kata2 all" "Suite de validacao offline da Kata 2"

  print_help_section_title "KATA 3 — Sistema legado em colapso"
  print_help_note "O Kata 3 e um documento. Leia: kata-3/PLANO.md"

  print_help_section_title "KATA 4 — Pipeline de indicadores"
  print_help_command "bash scripts/kata.sh kata4 pipeline" "Gera CSV consolidado e indicadores" "star"
  print_help_command "bash scripts/kata.sh kata4 tests" "Testes unitarios" "star"
  print_help_command "bash scripts/kata.sh kata4 all" "Pipeline + testes"

  print_help_section_title "SHOWCASE — Portal visual do repositorio"
  print_help_note "Serve como porta de entrada visual do projeto, sem substituir bash scripts/kata.sh nem os comandos manuais."
  print_help_command "bash scripts/kata.sh showcase serve" "Sobe o showcase com docs, visao geral e playground"
  print_help_command "bash scripts/kata.sh showcase tests" "Testa a API local e a logica do showcase"

  print_help_section_title "REPOSITORIO"
  print_help_command "bash scripts/kata.sh all validate" "Valida Kata 1 + Kata 2 + Kata 4"
  print_help_command "bash scripts/kata.sh help" "Esta tela de ajuda"

  printf '\nSem argumentos, o script abre o menu interativo.\n'
}

# ---------------------------------------------------------------------------
# Menus interativos
# ---------------------------------------------------------------------------

render_kata1_menu() {
  print_banner
  print_title "Kata 1 · Fila de Triagem" "Algoritmo, testes e demonstracoes"
  print_section "OBRIGATORIO PELO ENUNCIADO"
  print_menu_item "1" "Testes unitarios" "Parte A: ao menos dois casos cobrindo regras 4 e 5" "star"
  print_menu_item "2" "Exemplos do algoritmo" "Parte A: demo da ordenacao resultante" "star"
  print_section "EXTRAS DE VALIDACAO"
  print_menu_item "3" "Validacao completa resumida" "roda tudo (testes, SQL, demos)"
  print_menu_item "4" "Validacao completa detalhada" "saida longa para revisao linha a linha"
  print_menu_item "5" "Benchmark ilustrativo" "projecao de escala por ordens de grandeza"
  print_menu_item "6" "Explorer interativo" "rodar um caso, todos os casos ou simular volume"
  echo
  print_menu_item "0" "Voltar"
  echo
}

handle_kata1_menu_choice() {
  local choice="$1"
  local exit_code
  case "$choice" in
    0|q|Q) return 0 ;;
  esac
  run_menu_action "$choice" KATA1_MENU_ACTIONS
  exit_code=$?
  if (( exit_code == 2 )); then
    print_warning "Opcao invalida."
    pause_menu
  fi
  return 1
}

show_kata1_menu() {
  while true; do
    clear_screen_if_interactive
    render_kata1_menu
    read -r -p "> " choice
    handle_kata1_menu_choice "$choice" && return 0
  done
}

render_kata2_menu() {
  print_banner
  print_title "Kata 2 · Painel de Tarefas" "Backend .NET + frontend React/TypeScript"
  print_section "OBRIGATORIO PELO ENUNCIADO (Parte B e C)"
  print_menu_item "1" "Subir backend + frontend" "fluxo unificado com health check e trap" "star"
  print_menu_item "2" "Subir apenas backend" "http://localhost:5000" "star"
  print_menu_item "3" "Subir apenas frontend" "http://localhost:5173 (backend precisa estar no ar)" "star"
  print_section "EXTRAS DE VALIDACAO"
  print_menu_item "4" "Restore .NET"
  print_menu_item "5" "Build backend"
  print_menu_item "6" "Testes backend"
  print_menu_item "7" "Testes de contrato da API"
  print_menu_item "8" "Instalar dependencias do frontend"
  print_menu_item "9" "Lint frontend"
  print_menu_item "10" "Testes frontend"
  print_menu_item "11" "Build frontend"
  print_menu_item "12" "Auditoria frontend" "requer internet"
  print_menu_item "13" "Suite offline da Kata 2" "build + testes + lint + build frontend"
  echo
  print_menu_item "0" "Voltar"
  echo
}

handle_kata2_menu_choice() {
  local choice="$1"
  local exit_code
  case "$choice" in
    0|q|Q) return 0 ;;
  esac
  run_menu_action "$choice" KATA2_MENU_ACTIONS
  exit_code=$?
  if (( exit_code == 2 )); then
    print_warning "Opcao invalida."
    pause_menu
  fi
  return 1
}

show_kata2_menu() {
  while true; do
    clear_screen_if_interactive
    render_kata2_menu
    read -r -p "> " choice
    handle_kata2_menu_choice "$choice" && return 0
  done
}

render_kata4_menu() {
  print_banner
  print_title "Kata 4 · Pipeline de Indicadores" "Leitura, limpeza e consolidacao de CSV"
  print_section "OBRIGATORIO PELO ENUNCIADO"
  print_menu_item "1" "Rodar pipeline" "gera consolidated.csv e indicators.json" "star"
  print_menu_item "2" "Rodar testes" "cobertura das transformacoes" "star"
  print_section "EXTRAS"
  print_menu_item "3" "Pipeline + testes"
  echo
  print_menu_item "0" "Voltar"
  echo
}

handle_kata4_menu_choice() {
  local choice="$1"
  local exit_code
  case "$choice" in
    0|q|Q) return 0 ;;
  esac
  run_menu_action "$choice" KATA4_MENU_ACTIONS
  exit_code=$?
  if (( exit_code == 2 )); then
    print_warning "Opcao invalida."
    pause_menu
  fi
  return 1
}

show_kata4_menu() {
  while true; do
    clear_screen_if_interactive
    render_kata4_menu
    read -r -p "> " choice
    handle_kata4_menu_choice "$choice" && return 0
  done
}

render_main_menu() {
  print_banner
  print_environment_panel

  print_section "EXECUCAO AO VIVO (usa o produto)"
  print_menu_item "1" "Kata 2 · backend + frontend em um comando" "fluxo recomendado" "star"
  print_menu_item "2" "Kata 2 · apenas backend" "http://localhost:5000"
  print_menu_item "3" "Kata 2 · apenas frontend" "http://localhost:5173"
  print_menu_item "4" "Kata 1 · demonstracao do algoritmo"
  print_menu_item "5" "Kata 4 · rodar pipeline"

  print_section "VALIDACAO E TESTES"
  print_menu_item "6" "Validar tudo" "Katas 1, 2 e 4 — fluxo offline"
  print_menu_item "7" "Kata 1 · testes"
  print_menu_item "8" "Kata 2 · suite offline" "build + testes + lint + build frontend"
  print_menu_item "9" "Kata 4 · testes"

  print_section "SHOWCASE E APRESENTACAO"
  print_menu_item "s" "Showcase do repositorio" "porta de entrada visual, docs e playground"

  print_section "AVANCADO"
  print_menu_item "a" "Menu detalhado da Kata 1"
  print_menu_item "b" "Menu detalhado da Kata 2"
  print_menu_item "c" "Menu detalhado da Kata 4"
  print_menu_item "h" "Lista completa de comandos CLI"
  print_menu_item "0" "Sair"
  echo
}

handle_main_menu_choice() {
  local choice="$1"
  case "$choice" in
    1) kata2_dev; pause_menu ;;
    2) kata2_backend_dev; pause_menu ;;
    3) kata2_frontend_dev; pause_menu ;;
    4) kata1_demo; pause_menu ;;
    5) kata4_pipeline; pause_menu ;;
    6) validate_all; pause_menu ;;
    7) kata1_tests; pause_menu ;;
    8) kata2_all; pause_menu ;;
    9) kata4_tests; pause_menu ;;
    a|A) show_kata1_menu ;;
    b|B) show_kata2_menu ;;
    c|C) show_kata4_menu ;;
    s|S) showcase_serve; pause_menu ;;
    h|H) show_help; pause_menu ;;
    0|q|Q) exit 0 ;;
    *) print_warning "Opcao invalida."; pause_menu ;;
  esac
}

show_main_menu() {
  while true; do
    clear_screen_if_interactive
    render_main_menu
    read -r -p "> " choice
    handle_main_menu_choice "$choice"
  done
}

# ---------------------------------------------------------------------------
# Despacho CLI
# ---------------------------------------------------------------------------

declare -A CLI_ACTIONS=(
  ["menu:"]="show_main_menu"
  ["kata1:verify"]="kata1_verify"
  ["kata1:verify-verbose"]="kata1_verify_verbose"
  ["kata1:tests"]="kata1_tests"
  ["kata1:demo"]="kata1_demo"
  ["kata1:benchmark"]="kata1_benchmark"
  ["kata1:explore"]="kata1_explore"
  ["kata2:dev"]="kata2_dev"
  ["kata2:backend-build"]="kata2_backend_build"
  ["kata2:backend-restore"]="kata2_backend_restore"
  ["kata2:backend-dev"]="kata2_backend_dev"
  ["kata2:backend-tests"]="kata2_backend_tests"
  ["kata2:api-tests"]="kata2_api_tests"
  ["kata2:frontend-install"]="kata2_frontend_install"
  ["kata2:frontend-lint"]="kata2_frontend_lint"
  ["kata2:frontend-tests"]="kata2_frontend_tests"
  ["kata2:frontend-build"]="kata2_frontend_build"
  ["kata2:frontend-audit"]="kata2_frontend_audit"
  ["kata2:frontend-dev"]="kata2_frontend_dev"
  ["kata2:all"]="kata2_all"
  ["kata4:pipeline"]="kata4_pipeline"
  ["kata4:tests"]="kata4_tests"
  ["kata4:all"]="kata4_all"
  ["all:validate"]="validate_all"
  ["showcase:serve"]="showcase_serve"
  ["showcase:tests"]="showcase_tests"
)

dispatch() {
  local scope="${1:-menu}"
  local action="${2:-}"
  local key="${scope}:${action}"
  local handler="${CLI_ACTIONS[$key]-}"

  case "$scope" in
    help|-h|--help)
      show_help
      return 0
      ;;
  esac

  if [[ -n "$handler" ]]; then
    "$handler"
    return $?
  fi

  show_help
  return 2
}

dispatch "$@"
