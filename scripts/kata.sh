#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -t 1 && -n "${TERM:-}" && "${TERM:-}" != "dumb" ]]; then
  COLOR_RESET=$'\033[0m'
  COLOR_BOLD=$'\033[1m'
  COLOR_DIM=$'\033[2m'
  COLOR_CYAN=$'\033[36m'
  COLOR_GREEN=$'\033[32m'
  COLOR_YELLOW=$'\033[33m'
  COLOR_RED=$'\033[31m'
else
  COLOR_RESET=""
  COLOR_BOLD=""
  COLOR_DIM=""
  COLOR_CYAN=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_RED=""
fi

print_title() {
  local title="$1"
  local subtitle="${2:-}"

  echo
  printf '%b== %s ==%b\n' "${COLOR_BOLD}${COLOR_CYAN}" "$title" "${COLOR_RESET}"
  if [[ -n "$subtitle" ]]; then
    printf '%b%s%b\n' "${COLOR_DIM}" "$subtitle" "${COLOR_RESET}"
  fi
}

print_info() {
  printf '%b[INFO]%b %s\n' "${COLOR_CYAN}" "${COLOR_RESET}" "$1"
}

print_success() {
  printf '%b[OK]%b %s\n' "${COLOR_GREEN}" "${COLOR_RESET}" "$1"
}

print_warning() {
  printf '%b[WARN]%b %s\n' "${COLOR_YELLOW}" "${COLOR_RESET}" "$1"
}

print_error() {
  printf '%b[ERRO]%b %s\n' "${COLOR_RED}" "${COLOR_RESET}" "$1"
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

  printf '  %b[%s]%b %s' "${COLOR_BOLD}" "$key" "${COLOR_RESET}" "$label"
  if [[ -n "$description" ]]; then
    printf '%b  %s%b' "${COLOR_DIM}" "$description" "${COLOR_RESET}"
  fi
  printf '\n'
}

run_step() {
  local title="$1"
  shift

  print_title "$title" "Executando no diretório raiz do repositório"
  printf '%bComando:%b' "${COLOR_BOLD}" "${COLOR_RESET}"
  printf ' %q' "$@"
  printf '\n\n'

  if (
    cd "$ROOT_DIR" &&
      "$@"
  ); then
    print_success "Comando concluído com sucesso."
    return 0
  fi

  local exit_code=$?
  print_error "Comando finalizado com falha (código ${exit_code})."
  return "$exit_code"
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    print_error "Comando '$command_name' não encontrado no ambiente."
    return 127
  fi
}

pause_menu() {
  echo
  read -r -p "Pressione Enter para continuar..." _
}

kata1_verify() {
  require_command python3 || return $?
  run_step "Kata 1 · validação completa resumida" python3 kata-1/verify.py
}

kata1_verify_verbose() {
  require_command python3 || return $?
  run_step "Kata 1 · validação completa detalhada" python3 kata-1/verify.py --mode full-verbose
}

kata1_tests() {
  require_command python3 || return $?
  run_step "Kata 1 · testes" python3 -m unittest discover -s kata-1 -p 'test_*.py'
}

kata1_demo() {
  require_command python3 || return $?
  run_step "Kata 1 · exemplos executáveis" python3 kata-1/verify.py --mode demo
}

kata1_benchmark() {
  require_command python3 || return $?
  run_step "Kata 1 · benchmark ilustrativo" python3 kata-1/verify.py --mode benchmark
}

kata2_backend_build() {
  require_command dotnet || return $?
  run_step "Kata 2 · build do backend" dotnet build kata-2/backend/TaskBoard.Api.csproj
}

kata2_backend_dev() {
  require_command dotnet || return $?
  run_step "Kata 2 · backend em modo desenvolvimento" \
    dotnet run --project kata-2/backend/TaskBoard.Api.csproj --urls http://localhost:5000
}

kata2_backend_tests() {
  require_command dotnet || return $?
  run_step "Kata 2 · testes unitários do backend" \
    dotnet run --project kata-2/backend.tests/TaskBoard.Api.UnitTests.csproj
}

kata2_api_tests() {
  require_command python3 || return $?
  run_step "Kata 2 · testes de integração da API" \
    python3 -m unittest discover -s kata-2/tests -p 'test_*.py'
}

kata2_frontend_install() {
  require_command npm || return $?
  run_step "Kata 2 · instalar dependências do frontend" npm --prefix kata-2/frontend install
}

kata2_frontend_build() {
  require_command npm || return $?
  run_step "Kata 2 · build do frontend" npm --prefix kata-2/frontend run build
}

kata2_frontend_audit() {
  require_command npm || return $?
  run_step "Kata 2 · auditoria do frontend" npm --prefix kata-2/frontend audit --audit-level=high
}

kata2_frontend_dev() {
  require_command npm || return $?
  run_step "Kata 2 · frontend em modo desenvolvimento" npm --prefix kata-2/frontend run dev
}

kata2_all() {
  kata2_backend_build &&
    kata2_backend_tests &&
    kata2_api_tests &&
    kata2_frontend_build &&
    kata2_frontend_audit
}

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

validate_all() {
  kata1_verify &&
    kata2_all &&
    kata4_all
}

show_help() {
  print_title "Runner dos Katas" "Ajuda e comandos disponíveis"
  cat <<'EOF'
Uso:
  bash scripts/kata.sh
  bash scripts/kata.sh help

Kata 1:
  bash scripts/kata.sh kata1 verify
  bash scripts/kata.sh kata1 verify-verbose
  bash scripts/kata.sh kata1 tests
  bash scripts/kata.sh kata1 demo
  bash scripts/kata.sh kata1 benchmark

Kata 2:
  bash scripts/kata.sh kata2 backend-build
  bash scripts/kata.sh kata2 backend-dev
  bash scripts/kata.sh kata2 backend-tests
  bash scripts/kata.sh kata2 api-tests
  bash scripts/kata.sh kata2 frontend-install
  bash scripts/kata.sh kata2 frontend-build
  bash scripts/kata.sh kata2 frontend-audit
  bash scripts/kata.sh kata2 frontend-dev
  bash scripts/kata.sh kata2 all

Kata 4:
  bash scripts/kata.sh kata4 pipeline
  bash scripts/kata.sh kata4 tests
  bash scripts/kata.sh kata4 all

Repositório:
  bash scripts/kata.sh all validate

Sem argumentos, o script abre um menu interativo.
EOF
}

show_kata1_menu() {
  while true; do
    clear_screen_if_interactive
    print_title "Kata 1" "Fila de triagem"
    print_menu_item "1" "Validação completa resumida"
    print_menu_item "2" "Validação completa detalhada"
    print_menu_item "3" "Testes"
    print_menu_item "4" "Exemplos"
    print_menu_item "5" "Benchmark"
    print_menu_item "0" "Voltar"
    echo
    read -r -p "> " choice

    case "$choice" in
      1) kata1_verify; pause_menu ;;
      2) kata1_verify_verbose; pause_menu ;;
      3) kata1_tests; pause_menu ;;
      4) kata1_demo; pause_menu ;;
      5) kata1_benchmark; pause_menu ;;
      0) return 0 ;;
      *) print_warning "Opção inválida."; pause_menu ;;
    esac
  done
}

show_kata2_menu() {
  while true; do
    clear_screen_if_interactive
    print_title "Kata 2" "Backend e frontend"
    print_menu_item "1" "Build backend"
    print_menu_item "2" "Rodar backend"
    print_menu_item "3" "Testes backend"
    print_menu_item "4" "Testes API"
    print_menu_item "5" "Instalar frontend"
    print_menu_item "6" "Build frontend"
    print_menu_item "7" "Auditoria frontend"
    print_menu_item "8" "Rodar frontend"
    print_menu_item "9" "Validar kata 2"
    print_menu_item "0" "Voltar"
    echo
    read -r -p "> " choice

    case "$choice" in
      1) kata2_backend_build; pause_menu ;;
      2) kata2_backend_dev; pause_menu ;;
      3) kata2_backend_tests; pause_menu ;;
      4) kata2_api_tests; pause_menu ;;
      5) kata2_frontend_install; pause_menu ;;
      6) kata2_frontend_build; pause_menu ;;
      7) kata2_frontend_audit; pause_menu ;;
      8) kata2_frontend_dev; pause_menu ;;
      9) kata2_all; pause_menu ;;
      0) return 0 ;;
      *) print_warning "Opção inválida."; pause_menu ;;
    esac
  done
}

show_kata4_menu() {
  while true; do
    clear_screen_if_interactive
    print_title "Kata 4" "Pipeline CSV"
    print_menu_item "1" "Rodar pipeline"
    print_menu_item "2" "Rodar testes"
    print_menu_item "3" "Validar kata 4"
    print_menu_item "0" "Voltar"
    echo
    read -r -p "> " choice

    case "$choice" in
      1) kata4_pipeline; pause_menu ;;
      2) kata4_tests; pause_menu ;;
      3) kata4_all; pause_menu ;;
      0) return 0 ;;
      *) print_warning "Opção inválida."; pause_menu ;;
    esac
  done
}

show_main_menu() {
  while true; do
    clear_screen_if_interactive
    print_title "Runner dos Katas"
    print_menu_item "1" "Kata 1"
    print_menu_item "2" "Kata 2"
    print_menu_item "3" "Kata 4"
    print_menu_item "4" "Validar tudo"
    print_menu_item "5" "Ajuda"
    print_menu_item "0" "Sair"
    echo
    read -r -p "> " choice

    case "$choice" in
      1) show_kata1_menu ;;
      2) show_kata2_menu ;;
      3) show_kata4_menu ;;
      4) validate_all; pause_menu ;;
      5) show_help; pause_menu ;;
      0) exit 0 ;;
      *) print_warning "Opção inválida."; pause_menu ;;
    esac
  done
}

dispatch() {
  local scope="${1:-menu}"
  local action="${2:-}"

  case "$scope" in
    menu)
      show_main_menu
      ;;
    help|-h|--help)
      show_help
      ;;
    kata1)
      case "$action" in
        verify) kata1_verify ;;
        verify-verbose) kata1_verify_verbose ;;
        tests) kata1_tests ;;
        demo) kata1_demo ;;
        benchmark) kata1_benchmark ;;
        *) show_help; return 2 ;;
      esac
      ;;
    kata2)
      case "$action" in
        backend-build) kata2_backend_build ;;
        backend-dev) kata2_backend_dev ;;
        backend-tests) kata2_backend_tests ;;
        api-tests) kata2_api_tests ;;
        frontend-install) kata2_frontend_install ;;
        frontend-build) kata2_frontend_build ;;
        frontend-audit) kata2_frontend_audit ;;
        frontend-dev) kata2_frontend_dev ;;
        all) kata2_all ;;
        *) show_help; return 2 ;;
      esac
      ;;
    kata4)
      case "$action" in
        pipeline) kata4_pipeline ;;
        tests) kata4_tests ;;
        all) kata4_all ;;
        *) show_help; return 2 ;;
      esac
      ;;
    all)
      case "$action" in
        validate) validate_all ;;
        *) show_help; return 2 ;;
      esac
      ;;
    *)
      show_help
      return 2
      ;;
  esac
}

dispatch "$@"
