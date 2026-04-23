@echo off
setlocal

call "%~dp0..\scripts\kata.cmd" showcase tests
exit /b %errorlevel%
