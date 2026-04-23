@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ---------------------------------------------------------------------------
rem Runner do Teste Tecnico Unimed Caruaru - versao Windows nativo (CMD)
rem ---------------------------------------------------------------------------
rem Esse arquivo espelha os comandos principais de scripts/kata.sh para quem
rem nao quer instalar Git Bash ou WSL. Foi pensado para CMD e PowerShell
rem (ambos sabem executar .cmd). Para terminal com todos os enfeites visuais
rem (cores ANSI, menu interativo), prefira:
rem
rem   - Linux / macOS / WSL ............ bash scripts/kata.sh
rem   - Git Bash no Windows ............ bash scripts/kata.sh
rem
rem Este runner cobre os comandos obrigatorios pelo enunciado (marcados com *
rem na tela de ajuda) e os extras mais uteis para avaliacao.
rem ---------------------------------------------------------------------------

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%" >nul
set "ROOT_DIR=%CD%"

set "KATA2_API_PROJECT=kata-2\backend\TaskBoard.Api.csproj"
set "KATA2_TESTS_PROJECT=kata-2\backend.tests\TaskBoard.Api.Tests.csproj"
set "KATA2_WEB_DIR=kata-2\frontend"
set "SHOWCASE_PORT=8787"

set "SCOPE=%~1"
set "ACTION=%~2"

if /I "%SCOPE%"=="" goto :show_help
if /I "%SCOPE%"=="help" goto :show_help
if /I "%SCOPE%"=="-h" goto :show_help
if /I "%SCOPE%"=="--help" goto :show_help
if /I "%SCOPE%"=="/?" goto :show_help

if /I "%SCOPE%"=="kata1" goto :kata1_dispatch
if /I "%SCOPE%"=="kata2" goto :kata2_dispatch
if /I "%SCOPE%"=="kata4" goto :kata4_dispatch
if /I "%SCOPE%"=="showcase" goto :showcase_dispatch
if /I "%SCOPE%"=="all" goto :all_dispatch

echo [ERRO] Escopo desconhecido: "%SCOPE%".
echo.
goto :show_help

rem ---------------------------------------------------------------------------
rem Kata 1
rem ---------------------------------------------------------------------------
:kata1_dispatch
if /I "%ACTION%"=="tests"          goto :kata1_tests
if /I "%ACTION%"=="demo"           goto :kata1_demo
if /I "%ACTION%"=="verify"         goto :kata1_verify
if /I "%ACTION%"=="verify-verbose" goto :kata1_verify_verbose
if /I "%ACTION%"=="benchmark"      goto :kata1_benchmark
if /I "%ACTION%"=="explore"        goto :kata1_explore
echo [ERRO] Acao desconhecida para kata1: "%ACTION%".
goto :show_help

:kata1_tests
call :resolve_python || goto :fail
echo ^>^> Kata 1 - testes unitarios
call :python_exec -m unittest discover -s kata-1 -p "test_*.py" || goto :fail
goto :done

:kata1_demo
call :resolve_python || goto :fail
echo ^>^> Kata 1 - demonstracao do algoritmo
call :python_exec kata-1\verify.py --mode demo || goto :fail
goto :done

:kata1_verify
call :resolve_python || goto :fail
echo ^>^> Kata 1 - validacao completa resumida
call :python_exec kata-1\verify.py || goto :fail
goto :done

:kata1_verify_verbose
call :resolve_python || goto :fail
echo ^>^> Kata 1 - validacao completa detalhada
call :python_exec kata-1\verify.py --mode full-verbose || goto :fail
goto :done

:kata1_benchmark
call :resolve_python || goto :fail
echo ^>^> Kata 1 - benchmark ilustrativo
call :python_exec kata-1\verify.py --mode benchmark || goto :fail
goto :done

:kata1_explore
call :resolve_python || goto :fail
echo ^>^> Kata 1 - explorer interativo
call :python_exec kata-1\explore.py || goto :fail
goto :done

rem ---------------------------------------------------------------------------
rem Kata 2
rem ---------------------------------------------------------------------------
:kata2_dispatch
if /I "%ACTION%"=="dev"              goto :kata2_dev
if /I "%ACTION%"=="backend-dev"      goto :kata2_backend_dev
if /I "%ACTION%"=="frontend-dev"     goto :kata2_frontend_dev
if /I "%ACTION%"=="backend-restore"  goto :kata2_backend_restore
if /I "%ACTION%"=="backend-build"    goto :kata2_backend_build
if /I "%ACTION%"=="backend-tests"    goto :kata2_backend_tests
if /I "%ACTION%"=="api-tests"        goto :kata2_api_tests
if /I "%ACTION%"=="frontend-install" goto :kata2_frontend_install
if /I "%ACTION%"=="frontend-lint"    goto :kata2_frontend_lint
if /I "%ACTION%"=="frontend-tests"   goto :kata2_frontend_tests
if /I "%ACTION%"=="frontend-build"   goto :kata2_frontend_build
if /I "%ACTION%"=="frontend-audit"   goto :kata2_frontend_audit
if /I "%ACTION%"=="all"              goto :kata2_all
echo [ERRO] Acao desconhecida para kata2: "%ACTION%".
goto :show_help

:kata2_dev
call :require_cmd dotnet || goto :fail
call :require_cmd npm    || goto :fail
call :require_frontend_install || goto :fail
echo ^>^> Kata 2 - backend + frontend (abra duas janelas)
echo.
echo [!] No Windows nativo, o fluxo unificado com health check fica disponivel
echo     apenas via Git Bash (bash scripts/kata.sh kata2 dev). Aqui, o runner
echo     abre duas janelas separadas: uma com o backend e outra com o frontend.
echo.
start "Kata 2 Backend"  cmd /k "cd /d %ROOT_DIR% && dotnet run --project %KATA2_API_PROJECT% --urls http://localhost:5000"
start "Kata 2 Frontend" cmd /k "cd /d %ROOT_DIR% && npm --prefix %KATA2_WEB_DIR% run dev"
goto :done

:kata2_backend_dev
call :require_cmd dotnet || goto :fail
echo ^>^> Kata 2 - backend em modo desenvolvimento
dotnet run --project "%KATA2_API_PROJECT%" --urls http://localhost:5000 || goto :fail
goto :done

:kata2_frontend_dev
call :require_cmd npm || goto :fail
call :require_frontend_install || goto :fail
echo ^>^> Kata 2 - frontend em modo desenvolvimento
npm --prefix "%KATA2_WEB_DIR%" run dev || goto :fail
goto :done

:kata2_backend_restore
call :require_cmd dotnet || goto :fail
echo ^>^> Kata 2 - restore do backend e testes
dotnet restore "%KATA2_TESTS_PROJECT%" || goto :fail
goto :done

:kata2_backend_build
call :require_cmd dotnet || goto :fail
call :require_kata2_restore || goto :fail
echo ^>^> Kata 2 - build do backend
dotnet build "%KATA2_API_PROJECT%" --no-restore || goto :fail
goto :done

:kata2_backend_tests
call :require_cmd dotnet || goto :fail
call :require_kata2_restore || goto :fail
echo ^>^> Kata 2 - testes unitarios do backend
dotnet test "%KATA2_TESTS_PROJECT%" --filter "Scope=Backend" --no-restore || goto :fail
goto :done

:kata2_api_tests
call :require_cmd dotnet || goto :fail
call :require_kata2_restore || goto :fail
echo ^>^> Kata 2 - testes de contrato da API
dotnet test "%KATA2_TESTS_PROJECT%" --filter "Scope=Api" --no-restore || goto :fail
goto :done

:kata2_frontend_install
call :require_cmd npm || goto :fail
echo ^>^> Kata 2 - instalar dependencias do frontend
npm --prefix "%KATA2_WEB_DIR%" install || goto :fail
goto :done

:kata2_frontend_lint
call :require_cmd npm || goto :fail
call :require_frontend_install || goto :fail
echo ^>^> Kata 2 - lint do frontend
npm --prefix "%KATA2_WEB_DIR%" run lint || goto :fail
goto :done

:kata2_frontend_tests
call :require_cmd npm || goto :fail
call :require_frontend_install || goto :fail
echo ^>^> Kata 2 - testes do frontend
npm --prefix "%KATA2_WEB_DIR%" run test || goto :fail
goto :done

:kata2_frontend_build
call :require_cmd npm || goto :fail
call :require_frontend_install || goto :fail
echo ^>^> Kata 2 - build de producao do frontend
npm --prefix "%KATA2_WEB_DIR%" run build || goto :fail
goto :done

:kata2_frontend_audit
call :require_cmd npm || goto :fail
echo ^>^> Kata 2 - auditoria de dependencias do frontend
npm --prefix "%KATA2_WEB_DIR%" audit --audit-level=high || goto :fail
goto :done

:kata2_all
call :require_cmd dotnet || goto :fail
call :require_cmd npm    || goto :fail
call :require_frontend_install || goto :fail
echo ^>^> Kata 2 - suite .NET + frontend (build, testes e lint)
dotnet restore "%KATA2_TESTS_PROJECT%"                          || goto :fail
dotnet build   "%KATA2_API_PROJECT%" --no-restore               || goto :fail
dotnet test    "%KATA2_TESTS_PROJECT%" --filter "Scope=Backend" --no-restore || goto :fail
dotnet test    "%KATA2_TESTS_PROJECT%" --filter "Scope=Api"     --no-restore || goto :fail
npm --prefix   "%KATA2_WEB_DIR%" run lint                       || goto :fail
npm --prefix   "%KATA2_WEB_DIR%" run test                       || goto :fail
npm --prefix   "%KATA2_WEB_DIR%" run build                      || goto :fail
goto :done

rem ---------------------------------------------------------------------------
rem Kata 4
rem ---------------------------------------------------------------------------
:kata4_dispatch
if /I "%ACTION%"=="pipeline" goto :kata4_pipeline
if /I "%ACTION%"=="tests"    goto :kata4_tests
if /I "%ACTION%"=="all"      goto :kata4_all
echo [ERRO] Acao desconhecida para kata4: "%ACTION%".
goto :show_help

:kata4_pipeline
call :resolve_python || goto :fail
echo ^>^> Kata 4 - pipeline
call :python_exec kata-4\pipeline.py || goto :fail
goto :done

:kata4_tests
call :resolve_python || goto :fail
echo ^>^> Kata 4 - testes
call :python_exec -m unittest discover -s kata-4 -p "test_*.py" || goto :fail
goto :done

:kata4_all
call :resolve_python || goto :fail
echo ^>^> Kata 4 - pipeline + testes
call :python_exec kata-4\pipeline.py                          || goto :fail
call :python_exec -m unittest discover -s kata-4 -p "test_*.py" || goto :fail
goto :done

rem ---------------------------------------------------------------------------
rem Showcase
rem ---------------------------------------------------------------------------
:showcase_dispatch
if /I "%ACTION%"=="serve" goto :showcase_serve
if /I "%ACTION%"=="tests" goto :showcase_tests
echo [ERRO] Acao desconhecida para showcase: "%ACTION%".
goto :show_help

:showcase_serve
call :resolve_python || goto :fail
echo ^>^> Showcase - portal visual em http://localhost:%SHOWCASE_PORT%
call :python_exec showcase\server.py --port %SHOWCASE_PORT% || goto :fail
goto :done

:showcase_tests
call :resolve_python || goto :fail
echo ^>^> Showcase - testes da API local
call :python_exec -m unittest discover -s showcase -p "test_*.py" || goto :fail
goto :done

rem ---------------------------------------------------------------------------
rem Agrupados
rem ---------------------------------------------------------------------------
:all_dispatch
if /I "%ACTION%"=="validate" goto :all_validate
echo [ERRO] Acao desconhecida para all: "%ACTION%".
goto :show_help

:all_validate
call :resolve_python || goto :fail
call :require_cmd dotnet || goto :fail
call :require_cmd npm    || goto :fail
call :require_frontend_install || goto :fail
echo ^>^> Repositorio - validacao completa (Kata 1 + Kata 2 + Kata 4)
call :python_exec kata-1\verify.py                              || goto :fail
dotnet restore "%KATA2_TESTS_PROJECT%"                          || goto :fail
dotnet build   "%KATA2_API_PROJECT%" --no-restore               || goto :fail
dotnet test    "%KATA2_TESTS_PROJECT%" --filter "Scope=Backend" --no-restore || goto :fail
dotnet test    "%KATA2_TESTS_PROJECT%" --filter "Scope=Api"     --no-restore || goto :fail
npm --prefix   "%KATA2_WEB_DIR%" run lint                       || goto :fail
npm --prefix   "%KATA2_WEB_DIR%" run test                       || goto :fail
npm --prefix   "%KATA2_WEB_DIR%" run build                      || goto :fail
call :python_exec kata-4\pipeline.py                            || goto :fail
call :python_exec -m unittest discover -s kata-4 -p "test_*.py" || goto :fail
goto :done

rem ---------------------------------------------------------------------------
rem Helpers
rem ---------------------------------------------------------------------------
:resolve_python
set "PYTHON_BIN="
set "PYTHON_ARGS="
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys" >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_BIN=py"
    set "PYTHON_ARGS=-3"
    exit /b 0
  )
  set "PYTHON_BIN=py"
  exit /b 0
)
where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_BIN=python"
  exit /b 0
)
call :find_python_outside_path "%LocalAppData%\Programs\Python"
if not errorlevel 1 (
  call :print_python_path_warning
  exit /b 0
)
call :find_python_outside_path "%ProgramFiles%"
if not errorlevel 1 (
  call :print_python_path_warning
  exit /b 0
)
echo [ERRO] Python 3 nao encontrado no PATH.
echo [ERRO] Instale Python 3.11+.
echo [ERRO] Windows: winget install -e --id Python.Python.3.12 --scope machine
echo [ERRO] Se voce acabou de instalar, feche este terminal e abra outro.
echo [ERRO] Depois teste: py -3 --version
echo [ERRO] Ou: python --version
echo [ERRO] Se ainda falhar, confira o PATH do Windows com: where python
echo [ERRO] Ou: where py
exit /b 1

:require_cmd
where %~1 >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Comando "%~1" nao encontrado no PATH.
  call :print_missing_cmd_guidance %~1
  exit /b 1
)
exit /b 0

:python_exec
"%PYTHON_BIN%" %PYTHON_ARGS% %*
exit /b %errorlevel%

:find_python_outside_path
if "%~1"=="" exit /b 1
if not exist "%~1" exit /b 1
for /f "delims=" %%I in ('where /r "%~1" python.exe 2^>nul') do (
  set "PYTHON_BIN=%%~fI"
  set "PYTHON_ARGS="
  exit /b 0
)
exit /b 1

:print_python_path_warning
echo [AVISO] Python encontrado fora do PATH: "%PYTHON_BIN%"
echo [AVISO] O runner vai usar esse executavel diretamente.
echo [AVISO] Para "python" ou "py" funcionarem no terminal, feche este CMD/PowerShell e abra outro.
echo [AVISO] Se ainda falhar, confira o PATH do Windows.
exit /b 0

:require_frontend_install
if exist "%KATA2_WEB_DIR%\node_modules" exit /b 0
echo [ERRO] Dependencias do frontend da Kata 2 ainda nao foram instaladas.
echo [ERRO] Rode: npm --prefix "%KATA2_WEB_DIR%" install
echo [ERRO] Ou: scripts\kata.cmd kata2 frontend-install
exit /b 1

:require_kata2_restore
if exist "kata-2\backend\obj\project.assets.json" if exist "kata-2\backend.tests\obj\project.assets.json" exit /b 0
echo [ERRO] Pacotes .NET da Kata 2 ainda nao foram restaurados.
echo [ERRO] Rode: dotnet restore "%KATA2_TESTS_PROJECT%"
echo [ERRO] Ou: scripts\kata.cmd kata2 backend-restore
exit /b 1

:print_missing_cmd_guidance
if /I "%~1"=="dotnet" (
  echo [ERRO] Instale .NET SDK 10 e confirme com: dotnet --version
  exit /b 0
)
if /I "%~1"=="npm" (
  echo [ERRO] Instale Node.js 22 LTS ou 20.19+; o npm vem junto.
  echo [ERRO] Depois confirme com: node --version
  echo [ERRO] E com: npm --version
  exit /b 0
)
if /I "%~1"=="curl" (
  echo [ERRO] Instale curl para usar o fluxo unificado em bash.
  echo [ERRO] No Windows nativo, use: scripts\kata.cmd kata2 dev
  exit /b 0
)
exit /b 0

:show_help
echo.
echo UNIMED CARUARU - Teste Tecnico de Desenvolvimento
echo Candidato: Gediael Kallebe da Silva Andrade
echo.
echo Uso:
echo   scripts\kata.cmd ^<escopo^> ^<acao^>
echo.
echo Escopos disponiveis:
echo   kata1    Fila de Triagem                 (Python)
echo   kata2    Painel de Tarefas               (.NET + React/TS)
echo   kata4    Pipeline de Indicadores         (Python)
echo   showcase Portal visual do repositorio    (Python)
echo   all      Repositorio inteiro
echo.
echo Acoes mais usadas (obrigatorias marcadas com *):
echo   kata1 tests               *  Testes unitarios do algoritmo de triagem
echo   kata1 demo                *  Demonstracao do algoritmo
echo   kata1 verify                 Validacao completa resumida
echo   kata1 verify-verbose         Validacao completa detalhada
echo   kata1 benchmark              Projecao de escala
echo   kata1 explore                Explorer interativo
echo.
echo   kata2 dev                 *  Abre backend + frontend em duas janelas
echo   kata2 backend-dev         *  Backend em http://localhost:5000
echo   kata2 frontend-dev        *  Frontend em http://localhost:5173
echo   kata2 backend-restore        Restore do projeto .NET
echo   kata2 backend-build          Build do backend
echo   kata2 backend-tests          Testes unitarios do backend
echo   kata2 api-tests              Testes de contrato da API
echo   kata2 frontend-install       Instala dependencias do frontend
echo   kata2 frontend-lint          Lint do frontend
echo   kata2 frontend-tests         Testes do frontend
echo   kata2 frontend-build         Build de producao do frontend
echo   kata2 frontend-audit         Auditoria de dependencias
echo   kata2 all                    Suite offline (.NET + frontend)
echo.
echo   kata4 pipeline            *  Gera CSV consolidado e indicadores
echo   kata4 tests               *  Testes unitarios do pipeline
echo   kata4 all                    Pipeline + testes
echo.
echo   showcase serve               Portal visual em http://localhost:8787
echo   showcase tests               Testes da API local do showcase
echo.
echo   all validate                 Valida Kata 1 + Kata 2 + Kata 4
echo.
echo Para menu interativo com identidade visual, use Git Bash ou WSL:
echo   bash scripts/kata.sh
echo.
popd >nul
endlocal
exit /b 0

:done
popd >nul
endlocal
exit /b 0

:fail
popd >nul
endlocal
exit /b 1
