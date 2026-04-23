@echo off
setlocal

call "%~dp0..\scripts\kata.cmd" showcase serve
exit /b %errorlevel%
