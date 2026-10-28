@echo off
REM ============================================
REM  CARTEIRA - ACESSO REAL (seus dados)
REM  IMPORTANTE: usa "localhost" (nao 127.0.0.1)
REM  porque Firebase so autoriza localhost
REM ============================================
title Carteira - Acesso Real (Login Google)

echo Verificando servidor local...
netstat -an | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Servidor rodando
) else (
    echo [INICIANDO] Servidor local...
    start /min cmd /c "cd /d %~dp0 && node tests/local-http-server.js --port 8080"
    timeout /t 3 /nobreak >nul
)

start "" "http://localhost:8080/index.html"
echo Site aberto em http://localhost:8080
echo.
echo IMPORTANTE: use sempre "localhost" e NUNCA "127.0.0.1".
echo O Firebase so aceita login do dominio "localhost".
echo.
echo SE AINDA DER ERRO "dominio nao autorizado":
echo   1. Acesse https://console.firebase.google.com
echo   2. Projeto: carteira-de-investimento-16725
echo   3. Authentication ^> Settings ^> Authorized domains
echo   4. Clique "Add domain" e adicione: localhost
echo   5. Salve e tente o login novamente
pause
