@echo off
setlocal

cd /d "%~dp0\.."

call :resolve_python
if errorlevel 1 exit /b 1

echo ==================================================================
echo   URL       http://localhost:8787
echo   Origem    showcase/
echo   Modo      visao geral, docs, comandos e playground visual
echo   Escopo    camada de apresentacao; terminal continua oficial
echo   Encerrar  Ctrl+C
echo ------------------------------------------------------------------

"%PYTHON_BIN%" showcase\server.py
exit /b %errorlevel%

:resolve_python
where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_BIN=py"
  exit /b 0
)

where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_BIN=python"
  exit /b 0
)

echo [ERRO] Python nao encontrado no PATH.
echo [ERRO] Instale Python 3 e tente novamente.
exit /b 1
