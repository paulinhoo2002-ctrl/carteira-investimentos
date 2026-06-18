@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-backup-auto.ps1"
set "code=%errorlevel%"
if not "%code%"=="0" (
  echo.
  echo Falha ao ativar o backup automatico.
  pause
  exit /b %code%
)
echo.
echo Backup automatico ativado com sucesso.
pause
