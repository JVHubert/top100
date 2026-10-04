@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Top 100 - Instalacao

REM ============================================================
REM  TOP 100 - instalacao em um clique
REM  Confere Git e Node, configura a identidade, baixa o projeto,
REM  instala as dependencias e roda os testes.
REM  Seguro de rodar mais de uma vez: se ja existir, so atualiza.
REM ============================================================

REM Pasta onde o projeto sera instalado.
REM A variavel TOP100_DIR existe so para testes automatizados.
REM Voce nao precisa mexer nela.
set "MODO_TESTE="
if defined TOP100_DIR set "MODO_TESTE=1"
if not defined TOP100_DIR set "TOP100_DIR=%USERPROFILE%\projetos\top100"
set "PASTA=%TOP100_DIR%"
set "REPO=https://github.com/JVHubert/top100.git"

echo ==========================================================
echo              TOP 100  -  INSTALACAO
echo ==========================================================
echo.
echo  O projeto vai ficar em:
echo    %PASTA%
echo.
echo  Vai fazer, nesta ordem:
echo    1. Verificar se Git e Node.js estao instalados
echo    2. Configurar seu nome e email no Git
echo    3. Baixar o projeto do GitHub
echo    4. Instalar as dependencias
echo    5. Rodar os testes
echo.
echo  Se algo estiver faltando, o script te avisa e abre o site
echo  de download. Ai e so instalar e rodar este arquivo de novo.
echo.
pause

REM ---------- 1) GIT ----------
echo.
echo [1/5] Verificando o Git...
where git >nul 2>&1
if errorlevel 1 goto :sem_git
for /f "delims=" %%v in ('git --version') do set "GITVER=%%v"
echo       OK  -  !GITVER!

REM ---------- 2) NODE ----------
echo.
echo [2/5] Verificando o Node.js...
where node >nul 2>&1
if errorlevel 1 goto :sem_node
for /f "delims=" %%v in ('node --version') do set "NODEVER=%%v"
set "NODENUM=!NODEVER:~1!"
for /f "tokens=1 delims=." %%a in ("!NODENUM!") do set "NODENUM=%%a"
echo       OK  -  Node !NODEVER!
if !NODENUM! LSS 20 goto :node_velho

REM ---------- 3) IDENTIDADE ----------
echo.
echo [3/5] Identidade do Git, que aparece nos seus commits.
set "JA_EMAIL="
for /f "delims=" %%e in ('git config --global user.email 2^>nul') do set "JA_EMAIL=%%e"
if not "!JA_EMAIL!"=="" (
    echo       Ja configurado: !JA_EMAIL!
    goto :identidade_ok
)
echo.
echo       Use o mesmo email da sua conta do GitHub.
echo.
REM rotulos fora de blocos ( ): goto para dentro de um bloco quebra o .cmd
:pede_nome
set "GITNAME="
set /p "GITNAME=      Seu nome : "
if "!GITNAME!"=="" goto :pede_nome
:pede_email
set "GITMAIL="
set /p "GITMAIL=      Seu email: "
if "!GITMAIL!"=="" goto :pede_email
git config --global user.name "!GITNAME!"
git config --global user.email "!GITMAIL!"
echo       Salvo.
:identidade_ok

REM ---------- 4) BAIXAR O PROJETO ----------
echo.
echo [4/5] Baixando o projeto...
if exist "%PASTA%\.git" goto :ja_existe
for %%i in ("%PASTA%") do set "PASTA_PAI=%%~dpi"
if not exist "%PASTA_PAI%" mkdir "%PASTA_PAI%"
echo.
echo       ATENCAO: o repositorio e privado, entao o Git vai pedir
echo       para voce entrar. Uma janela do navegador deve abrir
echo       sozinha. Entre com a sua conta do GitHub e autorize.
echo.
git clone "%REPO%" "%PASTA%"
if errorlevel 1 goto :falhou_clone
goto :instalar

:ja_existe
echo       Ja existe uma copia. Atualizando...
git -C "%PASTA%" pull --ff-only
if errorlevel 1 goto :falhou_pull

:instalar
echo.
echo [5/5] Instalando e rodando os testes. Pode demorar um pouco...
pushd "%PASTA%"
call npm install
if errorlevel 1 goto :falhou_npm
echo.
call npm test
popd

echo.
echo ==========================================================
echo    PRONTO  -  o projeto esta instalado e funcionando.
echo ==========================================================
echo.
echo    Para jogar, de dois cliques no arquivo jogar-top100.cmd
echo    que voce salvou junto com este.
echo.
echo    Ou, no terminal:
echo        cd /d "%PASTA%"
echo        npm start
echo.
echo    Depois abra no navegador:  http://localhost:3000
echo.
pause
if not defined MODO_TESTE start "" "%PASTA%"
exit /b 0

REM ============================================================
REM  MENSAGENS DE ERRO  -  cada uma explica o que fazer
REM ============================================================

:sem_git
echo.
echo ==========================================================
echo    FALTOU O GIT
echo ==========================================================
echo.
echo    1. Baixe em:  https://git-scm.com/download/win
echo    2. Instale clicando NEXT ate o fim, sem mudar nada.
echo    3. FECHE esta janela e de dois cliques aqui de novo.
echo.
pause
start "" "https://git-scm.com/download/win"
exit /b 1

:sem_node
echo.
echo ==========================================================
echo    FALTOU O NODE.JS
echo ==========================================================
echo.
echo    1. Baixe em:  https://nodejs.org
echo    2. Escolha a versao LTS e instale clicando NEXT ate o fim.
echo    3. FECHE esta janela e de dois cliques aqui de novo.
echo.
pause
start "" "https://nodejs.org"
exit /b 1

:node_velho
echo.
echo ==========================================================
echo    NODE DESATUALIZADO  -  versao !NODEVER!
echo ==========================================================
echo    O projeto precisa da versao 20 ou mais nova.
echo.
echo    1. Baixe em:  https://nodejs.org
echo    2. Instale por cima da atual.
echo    3. FECHE esta janela e de dois cliques aqui de novo.
echo.
pause
start "" "https://nodejs.org"
exit /b 1

:falhou_clone
echo.
echo ==========================================================
echo    NAO CONSEGUI BAIXAR O PROJETO
echo ==========================================================
echo.
echo    Causas mais comuns:
echo.
echo    - Voce ainda nao aceitou o convite do repositorio.
echo      Veja em: https://github.com/notifications
echo.
echo    - Voce entrou com outra conta do GitHub.
echo      Confira em: https://github.com/settings/profile
echo.
echo    - A janela de login foi fechada por engano.
echo      Rode este arquivo de novo e autorize.
echo.
echo    Se nada disso resolver, mande um print desta tela.
echo.
pause
start "" "https://github.com/notifications"
exit /b 1

:falhou_pull
echo.
echo ==========================================================
echo    NAO CONSEGUI ATUALIZAR A COPIA QUE JA EXISTE
echo ==========================================================
echo    Voce tem alteracoes sem commit na pasta do projeto.
echo.
echo    Como ver o que mudou:
echo        git -C "%PASTA%" status
echo.
echo    Se nao souber o que fazer, mande o print para o JV.
echo.
pause
exit /b 1

:falhou_npm
popd
echo.
echo ==========================================================
echo    FALHOU NA INSTALACAO DAS DEPENDENCIAS
echo ==========================================================
echo    Tente apagar esta pasta e rodar de novo:
echo.
echo        %PASTA%\node_modules
echo.
pause
exit /b 1


