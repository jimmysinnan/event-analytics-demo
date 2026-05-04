@echo off
setlocal EnableDelayedExpansion
chcp 65001 > nul 2>&1

echo.
echo  ============================================================
echo   Event Analytics — Packaging livraison client
echo  ============================================================
echo.

:: ── Nom du client ─────────────────────────────────────────────────────────────
set /p CLIENT_NAME="Nom du client (meme que setup-client) : "
if "%CLIENT_NAME%"=="" ( echo ERREUR : nom requis. & pause & exit /b 1 )

set SRC=%~dp0..\event-analytics-%CLIENT_NAME%
set PKG=%~dp0..\EventAnalytics_%CLIENT_NAME%_Package

if not exist "%SRC%" (
  echo ERREUR : Instance client introuvable : %SRC%
  echo Executer d'abord setup-client.bat
  pause & exit /b 1
)

echo.
echo  Source  : %SRC%
echo  Package : %PKG%
echo.

:: ── Nettoyage dossier package existant ───────────────────────────────────────
if exist "%PKG%" rmdir /S /Q "%PKG%"
mkdir "%PKG%"
mkdir "%PKG%\app"
mkdir "%PKG%\app\backend"
mkdir "%PKG%\app\frontend_build"
mkdir "%PKG%\data"
mkdir "%PKG%\data\uploads"
mkdir "%PKG%\exports"
mkdir "%PKG%\exports\pdf"
mkdir "%PKG%\exports\reports"
mkdir "%PKG%\docs"

:: ── [1] Build du frontend ─────────────────────────────────────────────────────
echo  [1/5] Build frontend (Vite)...
cd /d "%SRC%\frontend"
call npm run build 2>&1
if errorlevel 1 ( echo ERREUR build frontend. & pause & exit /b 1 )
:: Copier le build dans le package
xcopy /E /I /Q "%SRC%\frontend\dist" "%PKG%\app\frontend_build" > nul
echo  OK — frontend compile dans app\frontend_build

:: ── [2] Copie du backend (source — V1) ───────────────────────────────────────
echo  [2/5] Copie du backend...
:: Fichiers Python principaux
copy /Y "%SRC%\backend\main.py"     "%PKG%\app\backend\" > nul
copy /Y "%SRC%\backend\database.py" "%PKG%\app\backend\" > nul
copy /Y "%SRC%\backend\requirements.txt" "%PKG%\app\backend\" > nul
:: Dossier services
mkdir "%PKG%\app\backend\services"
xcopy /E /I /Q "%SRC%\backend\services" "%PKG%\app\backend\services" > nul
:: SQLite vide
if exist "%SRC%\backend\data.db" (
  copy /Y "%SRC%\backend\data.db" "%PKG%\data\" > nul
) else (
  echo. > "%PKG%\data\.gitkeep" 2>nul
)
:: instructions_ia.md
if exist "%SRC%\instructions_ia.md" copy /Y "%SRC%\instructions_ia.md" "%PKG%\app\backend\" > nul
echo  OK — NOTE : backend livre en source Python (V1)

:: ── [3] config.env ────────────────────────────────────────────────────────────
echo  [3/5] Generation config.env...
:: Lire les valeurs depuis le .env de l'instance client
set ANTHROPIC_KEY=sk-ant-REMPLACER
set TOKEN=REMPLACER
set APP_NM=%CLIENT_NAME%

for /f "tokens=1,* delims==" %%a in ('type "%SRC%\backend\.env" ^| findstr /v "^#" ^| findstr /v "^$"') do (
  if "%%a"=="ANTHROPIC_API_KEY" set ANTHROPIC_KEY=%%b
  if "%%a"=="API_SECRET_TOKEN"  set TOKEN=%%b
  if "%%a"=="APP_NAME"          set APP_NM=%%b
)

(
echo # ============================================================
echo # Event Analytics — Configuration client
echo # Client : %CLIENT_NAME%
echo # ============================================================
echo.
echo # Cle API Anthropic — OBLIGATOIRE pour les rapports IA
echo # Obtenir sur : https://console.anthropic.com/
echo ANTHROPIC_API_KEY=%ANTHROPIC_KEY%
echo.
echo # Nom affiche dans l'interface et les rapports
echo APP_NAME=%APP_NM%
echo.
echo # Token de securite — ne pas modifier apres installation
echo API_SECRET_TOKEN=%TOKEN%
echo.
echo # Chemin vers un dossier de PDF de reference (optionnel)
echo PDF_SOURCE_DIR=
echo.
echo # IMPORTANT : indiquer le chemin vers le dossier frontend_build
echo # Exemple Windows : C:\EventAnalytics\app\frontend_build
echo # Laisser vide si frontend tourne separement
echo FRONTEND_BUILD_PATH=
) > "%PKG%\config.env"
echo  OK

:: ── [4] start.bat et stop.bat ─────────────────────────────────────────────────
echo  [4/5] Creation start.bat et stop.bat...

(
echo @echo off
echo chcp 65001 ^> nul 2^>^&1
echo echo.
echo echo  ============================================================
echo echo   Event Analytics — Demarrage
echo echo  ============================================================
echo echo.
echo.
echo :: Charger la configuration
echo set CFG=%%~dp0config.env
echo if not exist "%%CFG%%" ^( echo ERREUR : config.env introuvable. ^& pause ^& exit /b 1 ^)
echo.
echo for /f "tokens=1,* delims==" %%%%a in ^('type "%%CFG%%" ^| findstr /v "^#" ^| findstr /v "^$"'^) do (
echo   if "%%%%a"=="ANTHROPIC_API_KEY"    set ANTHROPIC_API_KEY=%%%%b
echo   if "%%%%a"=="APP_NAME"             set APP_NAME=%%%%b
echo   if "%%%%a"=="API_SECRET_TOKEN"     set API_SECRET_TOKEN=%%%%b
echo   if "%%%%a"=="PDF_SOURCE_DIR"       set PDF_SOURCE_DIR=%%%%b
echo   if "%%%%a"=="FRONTEND_BUILD_PATH"  set FRONTEND_BUILD_PATH=%%%%b
echo ^)
echo.
echo :: Chemin frontend par defaut si non defini
echo if "%%FRONTEND_BUILD_PATH%%"=="" set FRONTEND_BUILD_PATH=%%~dp0app\frontend_build
echo.
echo echo  Demarrage backend...
echo start "EA Backend" cmd /k "cd /d %%~dp0app\backend ^&^& set ANTHROPIC_API_KEY=%%ANTHROPIC_API_KEY%% ^&^& set APP_NAME=%%APP_NAME%% ^&^& set API_SECRET_TOKEN=%%API_SECRET_TOKEN%% ^&^& set PDF_SOURCE_DIR=%%PDF_SOURCE_DIR%% ^&^& set FRONTEND_BUILD_PATH=%%FRONTEND_BUILD_PATH%% ^&^& python -m uvicorn main:app --port 8001"
echo.
echo timeout /t 5 /nobreak ^> nul
echo.
echo echo  Application disponible sur : http://localhost:8001
echo start "" "http://localhost:8001"
echo.
echo pause
) > "%PKG%\start.bat"

(
echo @echo off
echo echo Arret de Event Analytics...
echo taskkill /F /FI "WINDOWTITLE eq EA Backend*" /T ^> nul 2^>^&1
echo echo Application arretee.
echo pause
) > "%PKG%\stop.bat"
echo  OK

:: ── [5] Documentation client ──────────────────────────────────────────────────
echo  [5/5] Creation documentation client...

:: README_CLIENT.md
(
echo # Event Analytics — Guide de demarrage
echo.
echo ## Lancement
echo.
echo Double-cliquer sur **start.bat**
echo.
echo L'application s'ouvre dans votre navigateur sur http://localhost:8001
echo.
echo Pour arreter : double-cliquer sur **stop.bat**
echo.
echo ## Configuration
echo.
echo Ouvrir **config.env** et verifier :
echo - `ANTHROPIC_API_KEY` : cle API Anthropic pour les rapports IA
echo - `APP_NAME` : nom de votre evenement
echo.
echo ## Premier demarrage
echo.
echo 1. Aller dans **Evenements** ^> creer votre premier evenement
echo 2. Aller dans **Importer donnees** ^> uploader vos fichiers
echo 3. Explorer les modules analytiques
echo 4. Generer votre premier rapport IA dans **Restitution PDF**
echo.
echo ## Prerequis
echo.
echo - Python 3.11+ installe (verifier : `python --version`)
echo - Connexion internet pour les rapports IA (API Claude)
echo.
echo ## Support
echo.
echo jimmy@orbyon.io
) > "%PKG%\docs\README_CLIENT.md"

:: GUIDE_IMPORT.md
(
echo # Guide d'import des donnees
echo.
echo ## Formats acceptes
echo.
echo - Excel : .xlsx .xls .xlsm .xlsb
echo - Tabule : .csv .tsv .txt
echo - Parquet : .parquet
echo - JSON : .json .jsonl
echo.
echo ## Sources billetterie reconnues automatiquement
echo.
echo Weezevent, Bizouk, BilletWeb, Eventbrite, HelloAsso,
echo Yurplan, Shotgun, Stripe, SumUp, Shopify, CSV generique
echo.
echo ## Procedure d'import
echo.
echo 1. Selectionner l'edition active (sélecteur en haut a droite)
echo 2. Aller dans **Importer donnees**
echo 3. Glisser-deposer le fichier sur le slot correspondant
echo 4. Verifier les KPIs affiches apres import
echo.
echo ## Reimport et deduplication
echo.
echo Reimporter le meme fichier ne cree pas de doublon.
echo La deduplication se fait par identifiant de commande.
echo.
echo ## Rollback
echo.
echo Pour annuler un import : Importer donnees ^> Historique des imports ^> Annuler
) > "%PKG%\docs\GUIDE_IMPORT.md"

:: LIMITES_V1.md
(
echo # Limites V1 — Event Analytics
echo.
echo ## Ce qui est operationnel
echo.
echo - Import billetterie multi-source avec deduplication
echo - Import consommation Weezpay
echo - 7 types de rapports IA (Claude Sonnet 4.6)
echo - Tableaux de bord analytiques (billetterie, conso, profil, invitations, stocks)
echo - Suivi live billetterie
echo - Export donnees brutes .txt
echo.
echo ## Limitations connues V1
echo.
echo - PDF generes utilisent des donnees de reference (pas vos donnees)
echo - Module Historique non disponible dans cette version
echo - Stockage local uniquement (SQLite) — pas de multi-utilisateurs simultanes
echo - Rapports IA necessitent une connexion internet (API Claude)
echo - Backend livre en Python source (pas de protection executable)
echo.
echo ## Sauvegardes
echo.
echo Sauvegarder regulierement le fichier data\data.db
echo Ce fichier contient toutes vos donnees importees.
) > "%PKG%\docs\LIMITES_V1.md"

echo  OK

:: ── Résumé ────────────────────────────────────────────────────────────────────
echo.
echo  ============================================================
echo   Package client pret !
echo  ============================================================
echo.
echo  Livrable : %PKG%
echo.
echo  Structure :
echo    start.bat             ^<-- Double-clic pour lancer
echo    stop.bat              ^<-- Arreter l'application
echo    config.env            ^<-- Configuration a verifier
echo    app\backend\          ^<-- Backend Python (V1 source)
echo    app\frontend_build\   ^<-- Frontend compile (pas de source)
echo    data\                 ^<-- Base de donnees SQLite
echo    exports\              ^<-- PDF et rapports generes
echo    docs\                 ^<-- Documentation client
echo.
echo  IMPORTANT — Avant livraison :
echo  1. Verifier config.env (ANTHROPIC_API_KEY)
echo  2. Tester start.bat sur une machine propre
echo  3. Zipper le dossier : %PKG%
echo.
echo  NOTE SECURITE V1 :
echo  Le backend est livre en code source Python.
echo  Le client peut lire les fichiers .py.
echo  Protection complete (exe) prevue en V2.
echo.

pause
endlocal
