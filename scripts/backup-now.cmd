@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-to-drive.ps1"
set "code=%errorlevel%"
if not "%code%"=="0" (
  echo.
  echo Backup falhou com codigo %code%.
  pause
  exit /b %code%
)
echo.
echo Backup concluido com sucesso.
pause
