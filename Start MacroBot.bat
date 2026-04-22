@echo off
title Scotty MacroBot
cd /d "%~dp0"
start "" /B cmd /c "npx vite > nul 2>&1"
timeout /t 3 /nobreak > nul
npx electron . --dev
