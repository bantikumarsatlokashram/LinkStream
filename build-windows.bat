@echo off
echo ========================================================
echo   LinkStream LAN Share - Building Windows .exe App
echo ========================================================
echo.
echo Installing dependencies if needed...
call npm install
echo.
echo Compiling React frontend and Express backend...
call npm run build
echo.
echo Packaging Windows .exe installer using Electron Builder...
call npx electron-builder --win nsis --x64
echo.
echo ========================================================
echo BUILD SUCCESSFUL!
echo Your Windows Installer (.exe) is saved in the "release" folder:
echo   release\LinkStream LAN Share Setup 1.0.0.exe
echo ========================================================
pause
