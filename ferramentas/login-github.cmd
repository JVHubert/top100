@echo off
chcp 65001 >nul
title Login no GitHub - Top 100
set "PATH=C:\Program Files\GitHub CLI;%PATH%"

echo ==========================================================
echo             LOGIN NO GITHUB  (Top 100)
echo ==========================================================
echo.
echo  Este arquivo e OPCIONAL.
echo  Use apenas se voce quiser instalar o GitHub CLI, que permite
echo  abrir e juntar Pull Requests direto pelo terminal.
echo.
echo  Para so jogar e programar, o instalar-top100.cmd ja basta.
echo.
echo 1) Um CODIGO vai aparecer logo abaixo.
echo 2) O navegador vai abrir sozinho em github.com/login/device
echo 3) Cole o codigo la, autorize e volte para esta janela.
echo.
pause

echo.
where gh >nul 2>&1
if errorlevel 1 goto :sem_gh

gh auth login --hostname github.com --git-protocol https --web

echo.
echo ==========================================================
echo   RESULTADO
echo ==========================================================
gh auth status
echo.
pause
exit /b 0

:sem_gh
echo.
echo ==========================================================
echo   GITHUB CLI NAO ENCONTRADO
echo ==========================================================
echo.
echo   1. Baixe em:  https://cli.github.com
echo   2. Instale clicando NEXT ate o fim.
echo   3. FECHE esta janela e de dois cliques aqui de novo.
echo.
pause
start "" "https://cli.github.com"
exit /b 1
