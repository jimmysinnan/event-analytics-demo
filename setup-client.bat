@echo off
setlocal

echo.
echo  =============================================
echo   Event Analytics — Setup installation client
echo  =============================================
echo.

:: ── Nom du client ─────────────────────────────────────────────────────────────
set /p CLIENT_NAME="Nom du client (ex: festival-ete, gala-2026) : "
if "%CLIENT_NAME%"=="" (
  echo  Erreur : nom requis.
  pause
  exit /b 1
)

set DEST=%~dp0..\event-analytics-%CLIENT_NAME%
echo.
echo  Dossier de destination : %DEST%
echo.

:: ── Copie du projet ───────────────────────────────────────────────────────────
echo  Copie des fichiers...
xcopy /E /I /Q /EXCLUDE:%~dp0setup-client.exclude.txt "%~dp0" "%DEST%"

:: ── Supprimer les fichiers spécifiques à la démo ──────────────────────────────
echo  Nettoyage données démo...
if exist "%DEST%\backend\data.db"          del /Q "%DEST%\backend\data.db"
if exist "%DEST%\backend\.env"             del /Q "%DEST%\backend\.env"
if exist "%DEST%\frontend\.env.local"      del /Q "%DEST%\frontend\.env.local"
if exist "%DEST%\.remember"               rmdir /S /Q "%DEST%\.remember"

:: ── Créer les fichiers .env pour le client ────────────────────────────────────
echo  Création des fichiers de configuration...

(
echo # Event Analytics — Configuration client %CLIENT_NAME%
echo ANTHROPIC_API_KEY=sk-ant-REMPLACER_PAR_VOTRE_CLE
echo APP_NAME=%CLIENT_NAME%
echo API_SECRET_TOKEN=REMPLACER_PAR_UN_TOKEN_SECRET
echo PDF_SOURCE_DIR=
echo CORS_ORIGINS=
) > "%DEST%\backend\.env"

(
echo VITE_API_URL=http://localhost:8001
echo VITE_API_TOKEN=REMPLACER_PAR_LE_MEME_TOKEN
echo VITE_APP_MODE=production
) > "%DEST%\frontend\.env.local"

:: ── Instructions ──────────────────────────────────────────────────────────────
echo.
echo  =============================================
echo   Installation terminee !
echo  =============================================
echo.
echo  Dossier : %DEST%
echo.
echo  Etapes suivantes :
echo  1. Ouvrir %DEST%\backend\.env
echo     - Remplacer ANTHROPIC_API_KEY par la vraie cle
echo     - Choisir un APP_NAME (nom du festival client)
echo     - Definir API_SECRET_TOKEN
echo.
echo  2. Ouvrir %DEST%\frontend\.env.local
echo     - Copier le meme API_SECRET_TOKEN
echo.
echo  3. Lancer l'application : double-cliquer start.bat dans %DEST%
echo.
echo  4. Dans l'application :
echo     - Aller dans "Evenements" pour creer l'evenement client
echo     - Aller dans "Importer donnees" pour uploader les fichiers
echo.

pause
endlocal
