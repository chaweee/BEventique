@echo off
REM Install sweetalert2 into the frontend folder and ensure deps are installed
cd /d "%~dp0frontend" || exit /b 1
echo Installing sweetalert2...
npm install sweetalert2 --save
echo Installing other dependencies (npm install)...
npm install
echo Done. Restart your dev server (e.g. npm start).
pause
