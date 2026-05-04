@echo off
setlocal EnableDelayedExpansion
chcp 65001 > nul 2>&1

echo.
echo  ============================================================
echo   Event Analytics — Preparation instance client (INTERNE)
echo  ============================================================
echo.
echo  Cette etape est reservee a un usage interne.
echo  Elle cree une copie source complete du projet.
echo  Pour livrer au client, utiliser build-client-package.bat.
echo.

:: ── Nom du client ─────────────────────────────────────────────────────────────
set /p CLIENT_NAME="Nom du client (ex: all-day, ladies-break) : "
if "%CLIENT_NAME%"=="" ( echo ERREUR : nom requis. & pause & exit /b 1 )

set /p API_KEY="Cle API Anthropic (sk-ant-...) [Entree pour laisser vide] : "
set /p APP_DISPLAY="Nom affiche dans l'app (ex: All Day Festival) : "
if "%APP_DISPLAY%"=="" set APP_DISPLAY=%CLIENT_NAME%

set DEST=%~dp0..\event-analytics-%CLIENT_NAME%

echo.
echo  Destination : %DEST%
echo.

:: ── Token securise (YYYYMMDD + nom + hash simple) ─────────────────────────────
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do (
  set TOKEN_DATE=%%a%%b%%c
)
:: Nettoyer le token de caracteres invalides
set TOKEN_RAW=%TOKEN_DATE%-%CLIENT_NAME%-ea2026
set TOKEN=%TOKEN_RAW: =-%

:: ── Copie du projet ───────────────────────────────────────────────────────────
echo  [1/5] Copie du projet...
if exist "%DEST%" (
  echo  ATTENTION : le dossier existe deja. Ecrasement...
  rmdir /S /Q "%DEST%" 2>nul
)
xcopy /E /I /Q /EXCLUDE:"%~dp0setup-client.exclude.txt" "%~dp0." "%DEST%" > nul
if errorlevel 1 ( echo ERREUR lors de la copie. & pause & exit /b 1 )
echo  OK

:: ── Nettoyage données démo ────────────────────────────────────────────────────
echo  [2/5] Suppression donnees demo...
if exist "%DEST%\backend\data.db"          del /Q "%DEST%\backend\data.db"
if exist "%DEST%\backend\.env"             del /Q "%DEST%\backend\.env"
if exist "%DEST%\frontend\.env.local"      del /Q "%DEST%\frontend\.env.local"
if exist "%DEST%\.remember"               rmdir /S /Q "%DEST%\.remember" 2>nul
if exist "%DEST%\.git"                    rmdir /S /Q "%DEST%\.git" 2>nul
if exist "%DEST%\pitch"                   rmdir /S /Q "%DEST%\pitch" 2>nul
echo  OK

:: ── Fichiers .env ─────────────────────────────────────────────────────────────
echo  [3/5] Creation des fichiers de configuration...

(
echo # Event Analytics — Configuration %CLIENT_NAME%
echo # Genere le %date%
echo.
echo # Cle API Anthropic — OBLIGATOIRE pour les rapports IA
if "%API_KEY%"=="" (
echo ANTHROPIC_API_KEY=sk-ant-REMPLACER_PAR_VOTRE_CLE
) else (
echo ANTHROPIC_API_KEY=%API_KEY%
)
echo.
echo # Nom affiche dans les PDF et les rapports
echo APP_NAME=%APP_DISPLAY%
echo.
echo # Token de securite API — meme valeur dans frontend .env.local
echo API_SECRET_TOKEN=%TOKEN%
echo.
echo # Dossier PDF de reference (laisser vide si non applicable)
echo PDF_SOURCE_DIR=
echo CORS_ORIGINS=
) > "%DEST%\backend\.env"

(
echo VITE_API_URL=http://localhost:8001
echo VITE_API_TOKEN=%TOKEN%
echo VITE_APP_MODE=production
) > "%DEST%\frontend\.env.local"
echo  OK

:: ── Installation dependances ──────────────────────────────────────────────────
echo  [4/5] Installation des dependances...

echo    Backend Python...
cd /d "%DEST%\backend"
python -m pip install -r requirements.txt -q --disable-pip-version-check
if errorlevel 1 ( echo ERREUR pip. & pause & exit /b 1 )

echo    Frontend Node...
cd /d "%DEST%\frontend"
call npm install --silent 2>nul
if errorlevel 1 ( echo ERREUR npm. & pause & exit /b 1 )
cd /d "%~dp0"
echo  OK

:: ── Test de démarrage backend ─────────────────────────────────────────────────
echo  [5/5] Test de demarrage backend...
cd /d "%DEST%\backend"
python -c "import main; print('Backend OK')"
if errorlevel 1 ( echo ERREUR import backend. & pause & exit /b 1 )
cd /d "%~dp0"
echo  OK

:: ── Résumé ────────────────────────────────────────────────────────────────────
echo.
echo  ============================================================
echo   Instance client prete !
echo  ============================================================
echo.
echo  Dossier : %DEST%
echo  Mode    : production (donnees demo masquees)
echo  Token   : %TOKEN%
echo.
echo  Pour lancer l'instance client :
echo    cd %DEST%
echo    start.bat
echo.
echo  Pour packager et livrer au client :
echo    build-client-package.bat
echo    (saisir le nom du client : %CLIENT_NAME%)
echo.
if "%API_KEY%"=="" (
  echo  ATTENTION : ANTHROPIC_API_KEY non renseignee.
  echo  Editer %DEST%\backend\.env avant livraison.
  echo.
)

pause
endlocal
