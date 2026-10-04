@echo off
chcp 65001 >nul
title Top 100 - Jogar

REM ============================================================
REM  TOP 100 - abre o jogo em um clique
REM  Atualiza o projeto, sobe o servidor e abre o navegador.
REM ============================================================

REM Mesma pasta usada pelo instalar-top100.cmd.
set "MODO_TESTE="
if defined TOP100_DIR set "MODO_TESTE=1"
if not defined TOP100_DIR set "TOP100_DIR=%USERPROFILE%\projetos\top100"
set "PASTA=%TOP100_DIR%"

if not exist "%PASTA%\package.json" (
    echo.
    echo    O projeto ainda nao foi instalado.
    echo    Rode primeiro o arquivo:  instalar-top100.cmd
    echo.
    pause
    exit /b 1
)

cd /d "%PASTA%"

echo Atualizando o projeto...
git pull --ff-only
if errorlevel 1 echo    Nao consegui atualizar. Seguindo com a versao local.

echo.
echo ==========================================================
echo    TOP 100 no ar  -  http://localhost:3000
echo ==========================================================
echo.
echo    O navegador vai abrir em alguns segundos.
echo    Para testar com dois jogadores, abra uma JANELA ANONIMA
echo    e entre tambem por http://localhost:3000
echo.
echo    Para encerrar, feche esta janela ou aperte Ctrl+C.
echo.

if not defined MODO_TESTE start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

call npm start

echo.
echo    O servidor parou.
pause
