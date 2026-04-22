@echo off
setlocal

cd /d "%~dp0\.."

call :resolve_python
if errorlevel 1 exit /b 1

"%PYTHON_BIN%" -m unittest discover -s showcase -p "test_*.py"
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
