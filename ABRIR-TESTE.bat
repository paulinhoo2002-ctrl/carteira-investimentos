@echo off
REM ============================================
REM  CARTEIRA DE INVESTIMENTOS - ACESSO FACIL
REM  Duplo clique = site aberto para teste
REM ============================================
title Carteira de Investimentos - Modo Teste

echo ============================================
echo   CARTEIRA DE INVESTIMENTOS
echo   Iniciando servidor local...
echo ============================================

REM Verifica se ja esta rodando na porta 8080
netstat -an | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Servidor ja esta rodando na porta 8080
) else (
    echo [INICIANDO] Subindo servidor sintetico...
    start /min cmd /c "cd /d %~dp0 && node tests/local-http-server.js --port 8080 --synthetic-qa"
    timeout /t 3 /nobreak >nul
)

echo.
echo [ABRINDO] Navegador com app sintetico (sem Firebase)...
start "" "http://localhost:8080/index.html?testMode=1&testReadOnly=1"

echo.
echo ============================================
echo   Site aberto no navegador!
echo   - Dados sinteticos (nao sao os seus)
echo   - Nenhum login necessario
echo   - Pode fechar esta janela
echo ============================================
echo.
echo Para ACESSO REAL (seus dados):
echo   1. Abra http://127.0.0.1:8080/index.html
echo   2. Login com Google (requer Firebase autorizado)
echo.
pause
